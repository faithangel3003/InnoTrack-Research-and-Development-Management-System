using InnoTrack.RDMS.Api.Domain.Enums;

namespace InnoTrack.RDMS.Api.Application.Dtos.Collaboration;

public class MessageDto
{
    public Guid Id { get; set; }
    public Guid ChannelId { get; set; }
    public Guid SenderId { get; set; }
    public string SenderName { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public MessageType Type { get; set; }
    public Guid? ParentMessageId { get; set; }
    public bool IsEdited { get; set; }
    public DateTime? EditedAt { get; set; }
    public bool IsPinned { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<MessageReactionDto> Reactions { get; set; } = new();
    public List<MessageAttachmentDto> Attachments { get; set; } = new();
}