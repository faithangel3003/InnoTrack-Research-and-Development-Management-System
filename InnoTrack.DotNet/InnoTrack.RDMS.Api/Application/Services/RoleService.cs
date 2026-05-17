using InnoTrack.RDMS.Api.Application.Dtos.Roles;
using InnoTrack.RDMS.Api.Application.Interfaces.Repositories;
using InnoTrack.RDMS.Api.Application.Interfaces.Services;

namespace InnoTrack.RDMS.Api.Application.Services;

public class RoleService(IRoleRepository roleRepository) : IRoleService
{
    public async Task<List<RoleDto>> GetRolesAsync(CancellationToken cancellationToken = default)
    {
        var roles = await roleRepository.GetAllAsync(cancellationToken);
        return roles.Select(x => new RoleDto
        {
            Id = x.Id,
            RoleName = x.RoleName,
            Description = x.Description
        }).ToList();
    }
}
