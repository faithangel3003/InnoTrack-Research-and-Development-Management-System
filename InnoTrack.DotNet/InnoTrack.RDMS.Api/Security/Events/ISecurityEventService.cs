using InnoTrack.RDMS.Api.Application.Dtos.Security;
using InnoTrack.RDMS.Api.Domain.Enums;

namespace InnoTrack.RDMS.Api.Security.Events;

public interface ISecurityEventService
{
    Task LogEventAsync(SecurityEventType eventType, SecuritySeverity severity, HttpContext context, string? details, Guid? userId = null, CancellationToken cancellationToken = default);
    Task LogEventAsync(SecurityEventType eventType, SecuritySeverity severity, string requestPath, string requestMethod, string? ipAddress, string? userAgent, string? details, Guid? userId = null, CancellationToken cancellationToken = default);
    Task<List<SecurityEventDto>> GetSecurityEventsAsync(SecurityEventQueryDto query, CancellationToken cancellationToken = default);
    Task<List<SecurityEventDto>> GetEventsByUserAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<List<SecurityEventDto>> GetHighSeverityEventsAsync(DateTime? since, CancellationToken cancellationToken = default);
}