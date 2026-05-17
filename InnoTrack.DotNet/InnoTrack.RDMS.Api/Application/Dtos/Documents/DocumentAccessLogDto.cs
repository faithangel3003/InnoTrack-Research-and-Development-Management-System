namespace InnoTrack.RDMS.Api.Application.Dtos.Documents;

public class DocumentAccessLogDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public DateTime AccessedAt { get; set; }
    public string? IpAddress { get; set; }
}