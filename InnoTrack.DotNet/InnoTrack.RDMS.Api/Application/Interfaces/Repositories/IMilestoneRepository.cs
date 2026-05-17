using InnoTrack.RDMS.Api.Domain.Entities;

namespace InnoTrack.RDMS.Api.Application.Interfaces.Repositories;

public interface IMilestoneRepository
{
    Task<List<Milestone>> GetByProjectAsync(Guid projectId, CancellationToken cancellationToken = default);
    Task<Milestone?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task AddAsync(Milestone milestone, CancellationToken cancellationToken = default);
    void Update(Milestone milestone);
    void Remove(Milestone milestone);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
