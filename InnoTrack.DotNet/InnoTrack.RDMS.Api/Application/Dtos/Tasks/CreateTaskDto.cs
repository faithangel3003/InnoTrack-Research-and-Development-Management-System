using System.ComponentModel.DataAnnotations;

namespace InnoTrack.RDMS.Api.Application.Dtos.Tasks;

public class CreateTaskDto
{
    [Required]
    [MaxLength(255)]
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }
    public Guid AssignedToUserId { get; set; }

    [Required]
    public string Priority { get; set; } = "Medium";

    public DateTime DueDate { get; set; }
}
