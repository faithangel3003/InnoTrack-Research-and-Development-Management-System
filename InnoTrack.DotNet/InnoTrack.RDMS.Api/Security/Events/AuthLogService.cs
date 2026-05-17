using InnoTrack.RDMS.Api.Domain.Entities;
using InnoTrack.RDMS.Api.Domain.Enums;
using InnoTrack.RDMS.Api.Infrastructure.Data;

namespace InnoTrack.RDMS.Api.Security.Events;

public sealed class AuthLogService(AppDbContext dbContext) : IAuthLogService
{
    public async Task LogAsync(Guid? userId, string email, AuthenticationEventType eventType, string? ipAddress, string? userAgent, string? reason, CancellationToken cancellationToken = default)
    {
        await dbContext.AuthenticationLogs.AddAsync(new AuthenticationLog
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Email = email,
            EventType = eventType,
            IPAddress = ipAddress,
            UserAgent = userAgent,
            FailureReason = reason,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        }, cancellationToken);

        await dbContext.SaveChangesAsync(cancellationToken);
    }
}