using InnoTrack.RDMS.Api.Domain.Enums;

namespace InnoTrack.RDMS.Api.Domain.Entities;

public class SecurityEvent : BaseEntity
{
    public SecurityEventType EventType { get; set; }
    public Guid? UserId { get; set; }
    public string? IPAddress { get; set; }
    public string? UserAgent { get; set; }
    public string RequestPath { get; set; } = string.Empty;
    public string RequestMethod { get; set; } = string.Empty;
    public string? Details { get; set; }
    public SecuritySeverity Severity { get; set; }

    public AppUser? User { get; set; }
}