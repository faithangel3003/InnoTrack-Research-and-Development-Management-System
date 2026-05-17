namespace InnoTrack.RDMS.Api.Domain.Entities;

public class PaymentTransaction : BaseEntity
{
    public Guid OrganizationId { get; set; }
    public Guid? SubscriptionId { get; set; }
    public string ReferenceNumber { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Method { get; set; } = "Manual";
    public string Status { get; set; } = "Pending";
    public string? Description { get; set; }
    public DateTime? BillingPeriodStart { get; set; }
    public DateTime? BillingPeriodEnd { get; set; }
    public string? GatewayMessage { get; set; }
    public DateTime? PaidAt { get; set; }

    public Organization Organization { get; set; } = null!;
    public OrganizationSubscription? Subscription { get; set; }
}