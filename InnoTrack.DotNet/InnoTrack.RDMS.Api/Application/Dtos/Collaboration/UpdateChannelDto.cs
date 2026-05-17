using System.ComponentModel.DataAnnotations;

namespace InnoTrack.RDMS.Api.Application.Dtos.Collaboration;

public class UpdateChannelDto
{
    [Required]
    [MaxLength(160)]
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }
    public bool IsArchived { get; set; }
}