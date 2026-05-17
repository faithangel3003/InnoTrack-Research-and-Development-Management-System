using InnoTrack.RDMS.Api.Application.Interfaces.Repositories;
using InnoTrack.RDMS.Api.Domain.Entities;
using InnoTrack.RDMS.Api.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace InnoTrack.RDMS.Api.Infrastructure.Repositories;

public class TaskRepository(AppDbContext dbContext) : ITaskRepository
{
    public Task<List<ProjectTask>> GetByProjectAsync(Guid projectId, CancellationToken cancellationToken = default)
    {
        return dbContext.ProjectTasks
            .Where(x => x.ProjectId == projectId)
            .OrderBy(x => x.DueDate)
            .ToListAsync(cancellationToken);
    }

    public Task<List<ProjectTask>> GetByAssignedUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return dbContext.ProjectTasks
            .Where(x => x.AssignedToUserId == userId)
            .OrderBy(x => x.DueDate)
            .ToListAsync(cancellationToken);
    }

    public Task<ProjectTask?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return dbContext.ProjectTasks.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public async Task AddAsync(ProjectTask task, CancellationToken cancellationToken = default)
    {
        await dbContext.ProjectTasks.AddAsync(task, cancellationToken);
    }

    public void Update(ProjectTask task)
    {
        dbContext.ProjectTasks.Update(task);
    }

    public Task UpdateStatusAsync(ProjectTask task, CancellationToken cancellationToken = default)
    {
        dbContext.ProjectTasks.Update(task);
        return Task.CompletedTask;
    }

    public void Remove(ProjectTask task)
    {
        dbContext.ProjectTasks.Remove(task);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return dbContext.SaveChangesAsync(cancellationToken);
    }
}
