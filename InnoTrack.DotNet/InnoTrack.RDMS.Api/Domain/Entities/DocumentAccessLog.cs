using InnoTrack.RDMS.Api.Domain.Enums;

namespace InnoTrack.RDMS.Api.Domain.Entities;

public class DocumentAccessLog : BaseEntity
{
    public Guid DocumentId { get; set; }
    public Guid UserId { get; set; }
    public DocumentAccessAction Action { get; set; }
    public DateTime AccessedAt { get; set; } = DateTime.UtcNow;
    public string? IpAddress { get; set; }

    public Document Document { get; set; } = null!;
    public AppUser User { get; set; } = null!;
}