using System.ComponentModel.DataAnnotations;

namespace InnoTrack.RDMS.Api.Application.Dtos.Collaboration;

public class UpdateMessageDto
{
    [Required]
    public string Content { get; set; } = string.Empty;
}