namespace InnoTrack.RDMS.Api.Domain.Entities;

public class OrganizationSubscription : BaseEntity
{
    public Guid OrganizationId { get; set; }
    public string Plan { get; set; } = "Starter";
    public string Status { get; set; } = "Active";
    public DateTime StartDate { get; set; } = DateTime.UtcNow;
    public DateTime EndDate { get; set; } = DateTime.UtcNow.AddMonths(1);
    public string BillingCycle { get; set; } = "Monthly";
    public decimal Amount { get; set; }

    public Organization Organization { get; set; } = null!;
    public ICollection<PaymentTransaction> Payments { get; set; } = new List<PaymentTransaction>();
}