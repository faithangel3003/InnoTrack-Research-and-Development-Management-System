using InnoTrack.RDMS.Api.Domain.Entities;

namespace InnoTrack.RDMS.Api.Application.Interfaces.Repositories;

public interface ITaskRepository
{
    Task<List<ProjectTask>> GetByProjectAsync(Guid projectId, CancellationToken cancellationToken = default);
    Task<List<ProjectTask>> GetByAssignedUserAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<ProjectTask?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task AddAsync(ProjectTask task, CancellationToken cancellationToken = default);
    void Update(ProjectTask task);
    Task UpdateStatusAsync(ProjectTask task, CancellationToken cancellationToken = default);
    void Remove(ProjectTask task);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
