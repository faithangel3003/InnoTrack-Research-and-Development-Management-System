using System.ComponentModel.DataAnnotations;

namespace InnoTrack.RDMS.Api.Application.Dtos.Teams;

public class UpdateTeamDto
{
    [Required]
    [MaxLength(150)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }
}