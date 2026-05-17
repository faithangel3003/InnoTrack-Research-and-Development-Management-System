using System.ComponentModel.DataAnnotations;

namespace InnoTrack.RDMS.Api.Application.Dtos.Projects;

public class CreateProjectDto
{
    [Required]
    [MaxLength(255)]
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    [Required]
    public string Priority { get; set; } = "Medium";

    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public Guid OrganizationId { get; set; }
}
