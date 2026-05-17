using InnoTrack.RDMS.Api.Application.Interfaces.Repositories;
using InnoTrack.RDMS.Api.Domain.Entities;
using InnoTrack.RDMS.Api.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace InnoTrack.RDMS.Api.Infrastructure.Repositories;

public class TaskCommentRepository(AppDbContext dbContext) : ITaskCommentRepository
{
    public Task<List<TaskComment>> GetByTaskAsync(Guid taskId, CancellationToken cancellationToken = default)
    {
        return dbContext.TaskComments
            .Where(x => x.TaskId == taskId)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public Task<TaskComment?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return dbContext.TaskComments.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public async Task AddAsync(TaskComment comment, CancellationToken cancellationToken = default)
    {
        await dbContext.TaskComments.AddAsync(comment, cancellationToken);
    }

    public void Remove(TaskComment comment)
    {
        dbContext.TaskComments.Remove(comment);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return dbContext.SaveChangesAsync(cancellationToken);
    }
}
