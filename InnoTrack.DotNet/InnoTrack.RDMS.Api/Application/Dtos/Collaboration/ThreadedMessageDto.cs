namespace InnoTrack.RDMS.Api.Application.Dtos.Collaboration;

public class ThreadedMessageDto
{
    public MessageDto Parent { get; set; } = null!;
    public List<MessageDto> Replies { get; set; } = new();
}