namespace InnoTrack.RDMS.Api.Domain.Entities;

public class UnmaskLog : BaseEntity
{
    public Guid UserId { get; set; }
    public Guid TargetUserId { get; set; }
    public string FieldName { get; set; } = string.Empty;
    public string? IPAddress { get; set; }
    public string? UserAgent { get; set; }
    public DateTime Timestamp { get; set; }

    public AppUser User { get; set; } = null!;
    public AppUser TargetUser { get; set; } = null!;
}