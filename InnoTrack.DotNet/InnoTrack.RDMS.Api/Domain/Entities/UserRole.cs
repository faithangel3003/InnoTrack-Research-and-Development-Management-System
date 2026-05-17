using InnoTrack.RDMS.Api.Domain.Enums;

namespace InnoTrack.RDMS.Api.Domain.Entities;

public class UserRole : BaseEntity
{
    public Guid UserId { get; set; }
    public Guid OrganizationId { get; set; }
    public AppRole Role { get; set; }

    public AppUser User { get; set; } = null!;
    public Organization Organization { get; set; } = null!;
}
