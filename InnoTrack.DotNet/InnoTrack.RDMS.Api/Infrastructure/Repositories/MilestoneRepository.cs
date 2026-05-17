using InnoTrack.RDMS.Api.Application.Interfaces.Repositories;
using InnoTrack.RDMS.Api.Domain.Entities;
using InnoTrack.RDMS.Api.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace InnoTrack.RDMS.Api.Infrastructure.Repositories;

public class MilestoneRepository(AppDbContext dbContext) : IMilestoneRepository
{
    public Task<List<Milestone>> GetByProjectAsync(Guid projectId, CancellationToken cancellationToken = default)
    {
        return dbContext.Milestones
            .Where(x => x.ProjectId == projectId)
            .OrderBy(x => x.DueDate)
            .ToListAsync(cancellationToken);
    }

    public Task<Milestone?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return dbContext.Milestones.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public async Task AddAsync(Milestone milestone, CancellationToken cancellationToken = default)
    {
        await dbContext.Milestones.AddAsync(milestone, cancellationToken);
    }

    public void Update(Milestone milestone)
    {
        dbContext.Milestones.Update(milestone);
    }

    public void Remove(Milestone milestone)
    {
        dbContext.Milestones.Remove(milestone);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return dbContext.SaveChangesAsync(cancellationToken);
    }
}
