namespace InnoTrack.RDMS.Api.Application.Dtos.Collaboration;

public class MessageReactionDto
{
    public string Emoji { get; set; } = string.Empty;
    public int Count { get; set; }
    public List<string> UserNames { get; set; } = new();
    public bool ReactedByCurrentUser { get; set; }
}