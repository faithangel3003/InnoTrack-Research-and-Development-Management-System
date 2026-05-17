using InnoTrack.RDMS.Api.Domain.Entities;

namespace InnoTrack.RDMS.Api.Application.Interfaces.Repositories;

public interface IAuditLogRepository
{
    Task AddAsync(ActivityLog log, CancellationToken cancellationToken = default);
    Task<List<ActivityLog>> GetAllAsync(int take, CancellationToken cancellationToken = default);
    Task<List<ActivityLog>> GetByOrganizationIdAsync(Guid organizationId, int take, CancellationToken cancellationToken = default);
    Task<List<ActivityLog>> GetByUserIdAsync(Guid userId, int take, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
