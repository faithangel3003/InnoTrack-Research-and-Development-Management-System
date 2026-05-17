using InnoTrack.RDMS.Api.Application.Dtos.AuditLogs;
using InnoTrack.RDMS.Api.Application.Interfaces.Repositories;
using InnoTrack.RDMS.Api.Application.Interfaces.Services;
using InnoTrack.RDMS.Api.Domain.Entities;

namespace InnoTrack.RDMS.Api.Application.Services;

public class AuditLogService(IAuditLogRepository auditLogRepository) : IAuditLogService
{
    private const int DefaultPageSize = 50;

    public async Task LogActionAsync(Guid? userId, Guid? actorId, Guid? organizationId, string action, string module, Guid? entityId, string severity, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var log = new ActivityLog
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            ActorId = actorId,
            OrganizationId = organizationId,
            Action = action,
            EntityType = module,
            EntityId = entityId,
            Severity = severity,
            IpAddress = ipAddress,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await auditLogRepository.AddAsync(log, cancellationToken);
        await auditLogRepository.SaveChangesAsync(cancellationToken);
    }

    public async Task<List<AuditLogDto>> GetAllLogsAsync(string actorRole, Guid? actorOrganizationId, int pageSize, CancellationToken cancellationToken = default)
    {
        var normalizedRole = actorRole.Replace(" ", string.Empty).Trim().ToLowerInvariant();
        var boundedPageSize = NormalizePageSize(pageSize);
        var logs = normalizedRole == "systemadmin" && actorOrganizationId.HasValue
            ? await auditLogRepository.GetByOrganizationIdAsync(actorOrganizationId.Value, boundedPageSize, cancellationToken)
            : await auditLogRepository.GetAllAsync(boundedPageSize, cancellationToken);

        return logs.Select(Map).ToList();
    }

    public async Task<List<AuditLogDto>> GetLogsByUserAsync(Guid userId, int pageSize, CancellationToken cancellationToken = default)
    {
        var logs = await auditLogRepository.GetByUserIdAsync(userId, NormalizePageSize(pageSize), cancellationToken);
        return logs.Select(Map).ToList();
    }

    private static int NormalizePageSize(int pageSize)
    {
        if (pageSize <= 0)
        {
            return DefaultPageSize;
        }

        return Math.Min(pageSize, 200);
    }

    private static AuditLogDto Map(ActivityLog log)
    {
        return new AuditLogDto
        {
            Id = log.Id,
            UserId = log.UserId,
            Action = log.Action,
            Module = log.EntityType ?? string.Empty,
            TimestampUtc = log.CreatedAt,
            IpAddress = log.IpAddress
        };
    }
}
