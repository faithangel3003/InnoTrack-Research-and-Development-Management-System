namespace InnoTrack.RDMS.Api.Domain.Entities;

public class AnnouncementReadReceipt
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid AnnouncementId { get; set; }
    public Guid UserId { get; set; }
    public DateTime ReadAt { get; set; } = DateTime.UtcNow;

    public Announcement Announcement { get; set; } = null!;
    public AppUser User { get; set; } = null!;
}