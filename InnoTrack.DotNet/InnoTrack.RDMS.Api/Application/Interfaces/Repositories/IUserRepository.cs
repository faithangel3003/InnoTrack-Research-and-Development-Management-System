using InnoTrack.RDMS.Api.Domain.Entities;

namespace InnoTrack.RDMS.Api.Application.Interfaces.Repositories;

public interface IUserRepository
{
    Task<List<AppUser>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<List<AppUser>> GetByOrganizationAsync(Guid organizationId, CancellationToken cancellationToken = default);
    Task<AppUser?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<AppUser?> GetByEmailAsync(string email, CancellationToken cancellationToken = default);
    Task AddAsync(AppUser user, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
