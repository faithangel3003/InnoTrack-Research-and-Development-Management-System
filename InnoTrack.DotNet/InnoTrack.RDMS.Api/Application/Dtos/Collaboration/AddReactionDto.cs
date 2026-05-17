using System.ComponentModel.DataAnnotations;

namespace InnoTrack.RDMS.Api.Application.Dtos.Collaboration;

public class AddReactionDto
{
    [Required]
    [MaxLength(32)]
    public string Emoji { get; set; } = string.Empty;
}