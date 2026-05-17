using InnoTrack.RDMS.Api.Application.Interfaces.Repositories;
using InnoTrack.RDMS.Api.Domain.Entities;
using InnoTrack.RDMS.Api.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace InnoTrack.RDMS.Api.Infrastructure.Repositories;

public class ProjectRepository(AppDbContext dbContext) : IProjectRepository
{
    public Task<List<Project>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return dbContext.Projects
            .Include(x => x.Members)
            .OrderByDescending(x => x.UpdatedAt)
            .ToListAsync(cancellationToken);
    }

    public Task<Project?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return dbContext.Projects
            .Include(x => x.Members)
            .Include(x => x.StatusHistory)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public Task<List<Project>> GetByOrganizationAsync(Guid organizationId, CancellationToken cancellationToken = default)
    {
        return dbContext.Projects
            .Include(x => x.Members)
            .Where(x => x.OrganizationId == organizationId)
            .OrderByDescending(x => x.UpdatedAt)
            .ToListAsync(cancellationToken);
    }

    public Task<List<Project>> GetByUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return dbContext.Projects
            .Include(x => x.Members)
            .Where(x => x.CreatedByUserId == userId || x.Members.Any(m => m.UserId == userId))
            .OrderByDescending(x => x.UpdatedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task AddAsync(Project project, CancellationToken cancellationToken = default)
    {
        await dbContext.Projects.AddAsync(project, cancellationToken);
    }

    public void Update(Project project)
    {
        dbContext.Projects.Update(project);
    }

    public void Remove(Project project)
    {
        dbContext.Projects.Remove(project);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return dbContext.SaveChangesAsync(cancellationToken);
    }
}
