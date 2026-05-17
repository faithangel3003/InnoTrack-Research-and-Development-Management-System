namespace InnoTrack.RDMS.Api.Security.BruteForce;

public interface IBruteForceProtectionService
{
    Task RecordFailedAttemptAsync(string email, string? ipAddress, CancellationToken cancellationToken = default);
    Task<bool> IsIpBlockedAsync(string? ipAddress, CancellationToken cancellationToken = default);
    Task<bool> IsAccountLockedAsync(string email, CancellationToken cancellationToken = default);
    Task ClearAttemptsAsync(string email, string? ipAddress, CancellationToken cancellationToken = default);
    Task<DateTime?> GetLockoutExpiryAsync(string email, string? ipAddress, CancellationToken cancellationToken = default);
}