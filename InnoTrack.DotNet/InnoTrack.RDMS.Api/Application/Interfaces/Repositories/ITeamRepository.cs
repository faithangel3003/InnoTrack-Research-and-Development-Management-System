using InnoTrack.RDMS.Api.Domain.Entities;

namespace InnoTrack.RDMS.Api.Application.Interfaces.Repositories;

public interface ITeamRepository
{
    Task<List<Team>> GetByOrganizationAsync(Guid organizationId, CancellationToken cancellationToken = default);
    Task<Team?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<bool> ExistsByNameAsync(Guid organizationId, string name, Guid? excludeId = null, CancellationToken cancellationToken = default);
    Task<bool> OrganizationExistsAsync(Guid organizationId, CancellationToken cancellationToken = default);
    Task AddAsync(Team team, CancellationToken cancellationToken = default);
    Task UnassignUsersAsync(Guid teamId, CancellationToken cancellationToken = default);
    void Remove(Team team);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}