using InnoTrack.RDMS.Api.Domain.Entities;

namespace InnoTrack.RDMS.Api.Application.Interfaces.Repositories;

public interface IProjectMemberRepository
{
    Task<List<ProjectMember>> GetByProjectAsync(Guid projectId, CancellationToken cancellationToken = default);
    Task<ProjectMember?> GetByProjectAndUserAsync(Guid projectId, Guid userId, CancellationToken cancellationToken = default);
    Task AddAsync(ProjectMember member, CancellationToken cancellationToken = default);
    void Remove(ProjectMember member);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
