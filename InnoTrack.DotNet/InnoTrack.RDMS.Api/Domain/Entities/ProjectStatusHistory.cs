namespace InnoTrack.RDMS.Api.Domain.Entities;

public class ProjectStatusHistory
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProjectId { get; set; }
    public Guid ChangedByUserId { get; set; }
    public string OldStatus { get; set; } = string.Empty;
    public string NewStatus { get; set; } = string.Empty;
    public DateTime ChangedAt { get; set; } = DateTime.UtcNow;
    public string? Remarks { get; set; }

    public Project Project { get; set; } = null!;
    public AppUser ChangedByUser { get; set; } = null!;
}
