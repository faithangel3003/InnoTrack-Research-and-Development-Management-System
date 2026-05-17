using InnoTrack.RDMS.Api.Application.Interfaces.Repositories;
using InnoTrack.RDMS.Api.Domain.Entities;
using InnoTrack.RDMS.Api.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace InnoTrack.RDMS.Api.Infrastructure.Repositories;

public class AuditLogRepository(AppDbContext dbContext) : IAuditLogRepository
{
    private const int DefaultTake = 50;

    public async Task AddAsync(ActivityLog log, CancellationToken cancellationToken = default)
    {
        await dbContext.ActivityLogs.AddAsync(log, cancellationToken);
    }

    public Task<List<ActivityLog>> GetAllAsync(int take, CancellationToken cancellationToken = default)
    {
        return dbContext.ActivityLogs
            .AsNoTracking()
            .OrderByDescending(x => x.CreatedAt)
            .Take(NormalizeTake(take))
            .ToListAsync(cancellationToken);
    }

    public Task<List<ActivityLog>> GetByOrganizationIdAsync(Guid organizationId, int take, CancellationToken cancellationToken = default)
    {
        return dbContext.ActivityLogs
            .AsNoTracking()
            .Where(x => x.OrganizationId == organizationId)
            .OrderByDescending(x => x.CreatedAt)
            .Take(NormalizeTake(take))
            .ToListAsync(cancellationToken);
    }

    public Task<List<ActivityLog>> GetByUserIdAsync(Guid userId, int take, CancellationToken cancellationToken = default)
    {
        return dbContext.ActivityLogs
            .AsNoTracking()
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.CreatedAt)
            .Take(NormalizeTake(take))
            .ToListAsync(cancellationToken);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return dbContext.SaveChangesAsync(cancellationToken);
    }

    private static int NormalizeTake(int take)
    {
        if (take <= 0)
        {
            return DefaultTake;
        }

        return Math.Min(take, 200);
    }
}
