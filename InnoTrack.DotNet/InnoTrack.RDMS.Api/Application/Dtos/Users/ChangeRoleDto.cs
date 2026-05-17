using System.ComponentModel.DataAnnotations;

namespace InnoTrack.RDMS.Api.Application.Dtos.Users;

public class ChangeRoleDto
{
    [Range(1, 4)]
    public int RoleId { get; set; }
}
