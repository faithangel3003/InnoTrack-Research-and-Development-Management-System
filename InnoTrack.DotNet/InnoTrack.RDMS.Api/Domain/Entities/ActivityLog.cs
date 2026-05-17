namespace InnoTrack.RDMS.Api.Domain.Entities;

public class ActivityLog : BaseEntity
{
    public Guid? UserId { get; set; }
    public Guid? ActorId { get; set; }
    public Guid? OrganizationId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string? EntityType { get; set; }
    public Guid? EntityId { get; set; }
    public string? Metadata { get; set; }
    public string Severity { get; set; } = "info";
    public string? IpAddress { get; set; }
}
