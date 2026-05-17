using InnoTrack.RDMS.Api.Application.Dtos.Roles;

namespace InnoTrack.RDMS.Api.Application.Interfaces.Services;

public interface IRoleService
{
    Task<List<RoleDto>> GetRolesAsync(CancellationToken cancellationToken = default);
}
