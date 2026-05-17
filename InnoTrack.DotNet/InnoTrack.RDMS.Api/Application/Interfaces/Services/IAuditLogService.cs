using InnoTrack.RDMS.Api.Application.Dtos.AuditLogs;

namespace InnoTrack.RDMS.Api.Application.Interfaces.Services;

public interface IAuditLogService
{
    Task LogActionAsync(Guid? userId, Guid? actorId, Guid? organizationId, string action, string module, Guid? entityId, string severity, string? ipAddress, CancellationToken cancellationToken = default);
    Task<List<AuditLogDto>> GetAllLogsAsync(string actorRole, Guid? actorOrganizationId, int pageSize, CancellationToken cancellationToken = default);
    Task<List<AuditLogDto>> GetLogsByUserAsync(Guid userId, int pageSize, CancellationToken cancellationToken = default);
}
