namespace InnoTrack.RDMS.Api.Domain.Entities;

public class Organization : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Plan { get; set; } = "free";
    public string ApprovalStatus { get; set; } = "Approved";
    public bool Active { get; set; } = true;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? ContactPerson { get; set; }
    public string? ContactRole { get; set; }
    public string? Industry { get; set; }

    public ICollection<AppUser> Users { get; set; } = new List<AppUser>();
    public ICollection<Profile> Profiles { get; set; } = new List<Profile>();
    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
    public ICollection<Team> Teams { get; set; } = new List<Team>();
    public ICollection<Project> Projects { get; set; } = new List<Project>();
    public ICollection<OrganizationSubscription> Subscriptions { get; set; } = new List<OrganizationSubscription>();
    public ICollection<PaymentTransaction> Payments { get; set; } = new List<PaymentTransaction>();
}
