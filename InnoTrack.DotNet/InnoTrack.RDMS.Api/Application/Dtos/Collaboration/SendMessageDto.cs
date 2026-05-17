using System.ComponentModel.DataAnnotations;

namespace InnoTrack.RDMS.Api.Application.Dtos.Collaboration;

public class SendMessageDto
{
    [Required]
    public string Content { get; set; } = string.Empty;

    public Guid? ParentMessageId { get; set; }
}