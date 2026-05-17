namespace InnoTrack.RDMS.Api.Domain.Entities;

public class PendingPublicOnboarding : BaseEntity
{
    public string CompanyName { get; set; } = string.Empty;
    public string Industry { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string EncryptedPassword { get; set; } = string.Empty;
    public string PlanId { get; set; } = string.Empty;
    public string PaymentMethod { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? PayMongoCheckoutSessionId { get; set; }
    public string? PayMongoCheckoutUrl { get; set; }
    public string? PayMongoPaymentId { get; set; }
    public string? PayMongoReferenceNumber { get; set; }
    public string? GatewayMessage { get; set; }
    public DateTime? PaidAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public Guid? OrganizationId { get; set; }
    public Guid? AdminUserId { get; set; }
    public string? PaymentReference { get; set; }
}