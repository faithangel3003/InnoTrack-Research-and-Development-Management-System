namespace InnoTrack.RDMS.Api.Domain.Entities;

public class Team : BaseEntity
{
    public Guid OrganizationId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    public Organization? Organization { get; set; }
    public ICollection<AppUser> Users { get; set; } = new List<AppUser>();
}