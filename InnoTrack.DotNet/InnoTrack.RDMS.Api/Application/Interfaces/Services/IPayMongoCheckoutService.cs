namespace InnoTrack.RDMS.Api.Application.Interfaces.Services;

public interface IPayMongoCheckoutService
{
    Task<PayMongoCheckoutSessionResult> CreateCheckoutSessionAsync(PayMongoCreateCheckoutSessionRequest request, CancellationToken cancellationToken = default);
    Task<PayMongoCheckoutSessionStatus> GetCheckoutSessionAsync(string checkoutSessionId, CancellationToken cancellationToken = default);
}

public sealed record PayMongoCreateCheckoutSessionRequest(
    string CustomerName,
    string CustomerEmail,
    string? CustomerPhone,
    string Description,
    string LineItemName,
    long AmountInCentavos,
    IReadOnlyList<string> PaymentMethodTypes,
    string SuccessUrl,
    string CancelUrl,
    IReadOnlyDictionary<string, string> Metadata);

public sealed record PayMongoCheckoutSessionResult(
    string CheckoutSessionId,
    string CheckoutUrl,
    string Status,
    string? PaymentIntentId,
    string? PaymentIntentStatus);

public sealed record PayMongoCheckoutSessionStatus(
    string CheckoutSessionId,
    string Status,
    string? CheckoutUrl,
    string? PaymentIntentId,
    string? PaymentIntentStatus,
    IReadOnlyList<PayMongoPaymentRecord> Payments);

public sealed record PayMongoPaymentRecord(
    string Id,
    string? Status,
    string? ReferenceNumber);