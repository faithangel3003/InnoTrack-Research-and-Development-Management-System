using System.Security.Cryptography;
using InnoTrack.RDMS.Api.Application.Dtos.Security;
using InnoTrack.RDMS.Api.Infrastructure.Data;
using InnoTrack.RDMS.Api.Security.Encryption;
using InnoTrack.RDMS.Api.Security.Password;
using Microsoft.EntityFrameworkCore;

namespace InnoTrack.RDMS.Api.Security.Masking;

public sealed class UnmaskService(
    AppDbContext dbContext,
    IEncryptionService encryptionService,
    IPasswordHashService passwordHashService) : IUnmaskService
{
    public async Task<UnmaskTokenResponseDto> RequestUnmaskAsync(Guid requestedByUserId, RequestUnmaskDto request, string? ipAddress, string? userAgent, CancellationToken cancellationToken = default)
    {
        var requestingUser = await dbContext.Users.FirstOrDefaultAsync(x => x.Id == requestedByUserId, cancellationToken)
            ?? throw new UnauthorizedAccessException("Requesting user not found.");

        if (string.IsNullOrWhiteSpace(requestingUser.PasswordHash) || !passwordHashService.Verify(request.Password, requestingUser.PasswordHash))
        {
            throw new UnauthorizedAccessException("Password verification failed.");
        }

        _ = await dbContext.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == request.TargetUserId, cancellationToken)
            ?? throw new InvalidOperationException("Target user not found.");

        var token = GenerateToken();
        var now = DateTime.UtcNow;

        await dbContext.UnmaskRequests.AddAsync(new Domain.Entities.UnmaskRequest
        {
            Id = Guid.NewGuid(),
            RequestedByUserId = requestedByUserId,
            TargetUserId = request.TargetUserId,
            FieldName = request.FieldName.Trim().ToLowerInvariant(),
            VerificationToken = encryptionService.Encrypt(token),
            TokenExpiry = now.AddMinutes(5),
            IsUsed = false,
            CreatedAt = now,
            UpdatedAt = now,
        }, cancellationToken);

        await dbContext.SaveChangesAsync(cancellationToken);

        return new UnmaskTokenResponseDto
        {
            Token = token,
            ExpiresAt = now.AddMinutes(5),
        };
    }

    public async Task<UnmaskValueResponseDto> VerifyAndUnmaskAsync(Guid requestedByUserId, VerifyUnmaskDto request, string? ipAddress, string? userAgent, CancellationToken cancellationToken = default)
    {
        var fieldName = request.FieldName.Trim().ToLowerInvariant();
        var unmaskRequest = await dbContext.UnmaskRequests
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefaultAsync(x =>
                x.RequestedByUserId == requestedByUserId
                && x.TargetUserId == request.TargetUserId
                && x.FieldName == fieldName
                && !x.IsUsed,
                cancellationToken)
            ?? throw new InvalidOperationException("Unmask request not found.");

        if (unmaskRequest.TokenExpiry <= DateTime.UtcNow)
        {
            throw new InvalidOperationException("Unmask token has expired.");
        }

        var expectedToken = encryptionService.Decrypt(unmaskRequest.VerificationToken);
        if (!string.Equals(expectedToken, request.Token.Trim(), StringComparison.Ordinal))
        {
            throw new UnauthorizedAccessException("Invalid unmask token.");
        }

        var targetUser = await dbContext.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == request.TargetUserId, cancellationToken)
            ?? throw new InvalidOperationException("Target user not found.");

        var unmaskedValue = fieldName switch
        {
            "email" => targetUser.Email,
            "firstname" => targetUser.FirstName,
            "lastname" => targetUser.LastName,
            _ => throw new InvalidOperationException($"Field '{request.FieldName}' cannot be unmasked.")
        };

        unmaskRequest.IsUsed = true;
        unmaskRequest.UpdatedAt = DateTime.UtcNow;

        await dbContext.UnmaskLogs.AddAsync(new Domain.Entities.UnmaskLog
        {
            Id = Guid.NewGuid(),
            UserId = requestedByUserId,
            TargetUserId = request.TargetUserId,
            FieldName = fieldName,
            IPAddress = ipAddress,
            UserAgent = userAgent,
            Timestamp = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        }, cancellationToken);

        await dbContext.SaveChangesAsync(cancellationToken);

        return new UnmaskValueResponseDto { UnmaskedValue = unmaskedValue };
    }

    public Task<List<UnmaskLogDto>> GetUnmaskLogsAsync(CancellationToken cancellationToken = default)
    {
        return dbContext.UnmaskLogs.AsNoTracking()
            .OrderByDescending(x => x.Timestamp)
            .Take(200)
            .Select(x => new UnmaskLogDto
            {
                Id = x.Id,
                UserId = x.UserId,
                TargetUserId = x.TargetUserId,
                FieldName = x.FieldName,
                IPAddress = x.IPAddress,
                UserAgent = x.UserAgent,
                Timestamp = x.Timestamp,
            })
            .ToListAsync(cancellationToken);
    }

    private static string GenerateToken()
    {
        const string alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        return string.Concat(Enumerable.Range(0, 6)
            .Select(_ => alphabet[RandomNumberGenerator.GetInt32(alphabet.Length)]));
    }
}