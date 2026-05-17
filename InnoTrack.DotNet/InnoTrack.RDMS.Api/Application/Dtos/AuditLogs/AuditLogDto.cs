namespace InnoTrack.RDMS.Api.Application.Dtos.AuditLogs;

public class AuditLogDto
{
    public Guid Id { get; set; }
    public Guid? UserId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string Module { get; set; } = string.Empty;
    public DateTime TimestampUtc { get; set; }
    public string? IpAddress { get; set; }
}
