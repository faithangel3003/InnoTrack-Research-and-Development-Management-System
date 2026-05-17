using InnoTrack.RDMS.Api.Domain.Enums;

namespace InnoTrack.RDMS.Api.Security.Events;

public interface IAuthLogService
{
    Task LogAsync(Guid? userId, string email, AuthenticationEventType eventType, string? ipAddress, string? userAgent, string? reason, CancellationToken cancellationToken = default);
}