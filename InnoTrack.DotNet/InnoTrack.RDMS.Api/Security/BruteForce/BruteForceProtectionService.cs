using InnoTrack.RDMS.Api.Domain.Entities;
using InnoTrack.RDMS.Api.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace InnoTrack.RDMS.Api.Security.BruteForce;

public sealed class BruteForceProtectionService(IMemoryCache cache, IServiceScopeFactory scopeFactory) : IBruteForceProtectionService
{
    private const int AccountLockThreshold = 5;
    private const int IpLockThreshold = 5;
    private static readonly TimeSpan IpWindow = TimeSpan.FromMinutes(15);
    private static readonly TimeSpan AccountWindow = TimeSpan.FromMinutes(10);
    private static readonly TimeSpan IpLockDuration = TimeSpan.FromMinutes(30);
    private static readonly TimeSpan AccountLockDuration = TimeSpan.FromMinutes(1);

    public async Task RecordFailedAttemptAsync(string email, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        var normalizedIp = NormalizeIp(ipAddress);
        var now = DateTime.UtcNow;

        var accountEntry = cache.GetOrCreate($"bf-account:{normalizedEmail}", entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = AccountWindow;
            return new AttemptCounter();
        })!;
        accountEntry.Count++;
        accountEntry.LastAttemptAt = now;

        AttemptCounter? ipEntry = null;
        if (!string.IsNullOrWhiteSpace(normalizedIp))
        {
            ipEntry = cache.GetOrCreate($"bf-ip:{normalizedIp}", entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = IpWindow;
                return new AttemptCounter();
            })!;

            ipEntry.Count++;
            ipEntry.LastAttemptAt = now;
        }

        using var scope = scopeFactory.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await dbContext.FailedLoginAttempts.AddAsync(new FailedLoginAttempt
        {
            Id = Guid.NewGuid(),
            Email = normalizedEmail,
            IPAddress = normalizedIp,
            AttemptedAt = now,
            IsAccountLock = false,
            LockExpiresAt = null,
            CreatedAt = now,
            UpdatedAt = now,
        }, cancellationToken);

        if (accountEntry.Count >= AccountLockThreshold)
        {
            var lockExpiry = now.Add(AccountLockDuration);
            cache.Set($"bf-account-lock:{normalizedEmail}", lockExpiry, lockExpiry);
            await dbContext.FailedLoginAttempts.AddAsync(new FailedLoginAttempt
            {
                Id = Guid.NewGuid(),
                Email = normalizedEmail,
                IPAddress = normalizedIp,
                AttemptedAt = now,
                IsAccountLock = true,
                LockExpiresAt = lockExpiry,
                CreatedAt = now,
                UpdatedAt = now,
            }, cancellationToken);
        }

        if (ipEntry is not null && ipEntry.Count >= IpLockThreshold)
        {
            var lockExpiry = now.Add(IpLockDuration);
            cache.Set($"bf-ip-lock:{normalizedIp}", lockExpiry, lockExpiry);
            await dbContext.FailedLoginAttempts.AddAsync(new FailedLoginAttempt
            {
                Id = Guid.NewGuid(),
                Email = normalizedEmail,
                IPAddress = normalizedIp,
                AttemptedAt = now,
                IsAccountLock = false,
                LockExpiresAt = lockExpiry,
                CreatedAt = now,
                UpdatedAt = now,
            }, cancellationToken);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<bool> IsIpBlockedAsync(string? ipAddress, CancellationToken cancellationToken = default)
    {
        var normalizedIp = NormalizeIp(ipAddress);
        if (string.IsNullOrWhiteSpace(normalizedIp))
        {
            return false;
        }

        if (cache.TryGetValue<DateTime>($"bf-ip-lock:{normalizedIp}", out var lockExpiry) && lockExpiry > DateTime.UtcNow)
        {
            return true;
        }

        using var scope = scopeFactory.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var persistedLock = await dbContext.FailedLoginAttempts.AsNoTracking()
            .Where(x => x.IPAddress == normalizedIp && x.LockExpiresAt != null)
            .OrderByDescending(x => x.LockExpiresAt)
            .Select(x => x.LockExpiresAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (persistedLock.HasValue && persistedLock.Value > DateTime.UtcNow)
        {
            cache.Set($"bf-ip-lock:{normalizedIp}", persistedLock.Value, persistedLock.Value);
            return true;
        }

        return false;
    }

    public async Task<bool> IsAccountLockedAsync(string email, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        if (cache.TryGetValue<DateTime>($"bf-account-lock:{normalizedEmail}", out var lockExpiry) && lockExpiry > DateTime.UtcNow)
        {
            return true;
        }

        using var scope = scopeFactory.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var persistedLock = await dbContext.FailedLoginAttempts.AsNoTracking()
            .Where(x => x.Email == normalizedEmail && x.IsAccountLock && x.LockExpiresAt != null)
            .OrderByDescending(x => x.LockExpiresAt)
            .Select(x => x.LockExpiresAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (persistedLock.HasValue && persistedLock.Value > DateTime.UtcNow)
        {
            cache.Set($"bf-account-lock:{normalizedEmail}", persistedLock.Value, persistedLock.Value);
            return true;
        }

        return false;
    }

    public Task ClearAttemptsAsync(string email, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        var normalizedIp = NormalizeIp(ipAddress);

        cache.Remove($"bf-account:{normalizedEmail}");
        cache.Remove($"bf-account-lock:{normalizedEmail}");

        if (!string.IsNullOrWhiteSpace(normalizedIp))
        {
            cache.Remove($"bf-ip:{normalizedIp}");
            cache.Remove($"bf-ip-lock:{normalizedIp}");
        }

        return Task.CompletedTask;
    }

    public async Task<DateTime?> GetLockoutExpiryAsync(string email, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        var normalizedIp = NormalizeIp(ipAddress);

        if (cache.TryGetValue<DateTime>($"bf-account-lock:{normalizedEmail}", out var accountExpiry) && accountExpiry > DateTime.UtcNow)
        {
            return accountExpiry;
        }

        if (!string.IsNullOrWhiteSpace(normalizedIp) && cache.TryGetValue<DateTime>($"bf-ip-lock:{normalizedIp}", out var ipExpiry) && ipExpiry > DateTime.UtcNow)
        {
            return ipExpiry;
        }

        using var scope = scopeFactory.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await dbContext.FailedLoginAttempts.AsNoTracking()
            .Where(x => x.Email == normalizedEmail || (!string.IsNullOrWhiteSpace(normalizedIp) && x.IPAddress == normalizedIp))
            .Where(x => x.LockExpiresAt != null && x.LockExpiresAt > DateTime.UtcNow)
            .OrderByDescending(x => x.LockExpiresAt)
            .Select(x => x.LockExpiresAt)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public int GetCurrentAttemptCount(string email)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        if (cache.TryGetValue<AttemptCounter>($"bf-account:{normalizedEmail}", out var counter) && counter is not null)
        {
            return counter.Count;
        }

        return 0;
    }

    private static string? NormalizeIp(string? ipAddress)
    {
        return string.IsNullOrWhiteSpace(ipAddress) ? null : ipAddress.Trim();
    }

    private sealed class AttemptCounter
    {
        public int Count { get; set; }
        public DateTime LastAttemptAt { get; set; }
    }
}