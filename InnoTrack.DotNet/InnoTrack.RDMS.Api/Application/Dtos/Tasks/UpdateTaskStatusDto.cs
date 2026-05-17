using System.ComponentModel.DataAnnotations;

namespace InnoTrack.RDMS.Api.Application.Dtos.Tasks;

public class UpdateTaskStatusDto
{
    [Required]
    public string Status { get; set; } = string.Empty;
}
