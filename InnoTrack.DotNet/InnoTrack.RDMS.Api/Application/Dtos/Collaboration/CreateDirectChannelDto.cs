using System.ComponentModel.DataAnnotations;

namespace InnoTrack.RDMS.Api.Application.Dtos.Collaboration;

public class CreateDirectChannelDto
{
    [Required]
    public Guid TargetUserId { get; set; }
}