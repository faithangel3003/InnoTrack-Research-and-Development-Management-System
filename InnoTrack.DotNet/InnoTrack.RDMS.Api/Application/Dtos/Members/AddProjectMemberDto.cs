using System.ComponentModel.DataAnnotations;

namespace InnoTrack.RDMS.Api.Application.Dtos.Members;

public class AddProjectMemberDto
{
    [Required]
    public Guid UserId { get; set; }

    [Required]
    public string MemberRole { get; set; } = string.Empty;
}
