using InnoTrack.RDMS.Api.Domain.Entities;

namespace InnoTrack.RDMS.Api.Application.Interfaces.Repositories;

public interface ITaskCommentRepository
{
    Task<List<TaskComment>> GetByTaskAsync(Guid taskId, CancellationToken cancellationToken = default);
    Task<TaskComment?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task AddAsync(TaskComment comment, CancellationToken cancellationToken = default);
    void Remove(TaskComment comment);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
