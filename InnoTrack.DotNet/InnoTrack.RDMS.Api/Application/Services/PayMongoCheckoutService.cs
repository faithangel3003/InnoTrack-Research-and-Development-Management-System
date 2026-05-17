using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using InnoTrack.RDMS.Api.Application.Interfaces.Services;
using InnoTrack.RDMS.Api.Configuration;
using Microsoft.Extensions.Options;

namespace InnoTrack.RDMS.Api.Application.Services;

public sealed class PayMongoCheckoutService(
    IHttpClientFactory httpClientFactory,
    IOptions<PayMongoOptions> options) : IPayMongoCheckoutService
{
    private readonly PayMongoOptions payMongoOptions = options.Value;

    public async Task<PayMongoCheckoutSessionResult> CreateCheckoutSessionAsync(PayMongoCreateCheckoutSessionRequest request, CancellationToken cancellationToken = default)
    {
        var client = CreateClient();

        var send_email_receipt = true;
        var show_description = true;
        var show_line_items = true;
        var payment_method_types = request.PaymentMethodTypes;
        var metadata = request.Metadata;
        var line_items = new[]
        {
            new
            {
                currency = "PHP",
                amount = request.AmountInCentavos,
                name = request.LineItemName,
                quantity = 1,
                description = request.Description,
            },
        };

        var payload = new
        {
            data = new
            {
                attributes = new
                {
                    billing = new
                    {
                        name = request.CustomerName,
                        email = request.CustomerEmail,
                        phone = request.CustomerPhone,
                    },
                    send_email_receipt,
                    show_description,
                    show_line_items,
                    description = request.Description,
                    success_url = request.SuccessUrl,
                    cancel_url = request.CancelUrl,
                    line_items,
                    payment_method_types,
                    metadata,
                },
            },
        };

        using var response = await client.PostAsJsonAsync("checkout_sessions", payload, cancellationToken);
        return await ParseCheckoutSessionResultAsync(response, cancellationToken);
    }

    public async Task<PayMongoCheckoutSessionStatus> GetCheckoutSessionAsync(string checkoutSessionId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(checkoutSessionId))
        {
            throw new InvalidOperationException("PayMongo checkout session id is required.");
        }

        var client = CreateClient();
        using var response = await client.GetAsync($"checkout_sessions/{Uri.EscapeDataString(checkoutSessionId)}", cancellationToken);
        return await ParseCheckoutSessionStatusAsync(response, cancellationToken);
    }

    private HttpClient CreateClient()
    {
        if (string.IsNullOrWhiteSpace(payMongoOptions.SecretKey))
        {
            throw new InvalidOperationException("PayMongo is not configured. Set PAYMONGO_SECRET_KEY before using checkout.");
        }

        var client = httpClientFactory.CreateClient("PayMongo");
        var credentials = Convert.ToBase64String(Encoding.ASCII.GetBytes($"{payMongoOptions.SecretKey}:"));
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", credentials);
        return client;
    }

    private static async Task<PayMongoCheckoutSessionResult> ParseCheckoutSessionResultAsync(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        using var document = await ReadSuccessfulResponseAsync(response, "PayMongo checkout could not be created.", cancellationToken);
        var data = document.RootElement.GetProperty("data");
        var attributes = data.GetProperty("attributes");

        return new PayMongoCheckoutSessionResult(
            CheckoutSessionId: GetRequiredString(data, "id"),
            CheckoutUrl: GetRequiredString(attributes, "checkout_url"),
            Status: GetString(attributes, "status") ?? string.Empty,
            PaymentIntentId: GetString(attributes, "payment_intent", "id"),
            PaymentIntentStatus: GetString(attributes, "payment_intent", "attributes", "status"));
    }

    private static async Task<PayMongoCheckoutSessionStatus> ParseCheckoutSessionStatusAsync(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        using var document = await ReadSuccessfulResponseAsync(response, "PayMongo checkout could not be verified.", cancellationToken);
        var data = document.RootElement.GetProperty("data");
        var attributes = data.GetProperty("attributes");

        return new PayMongoCheckoutSessionStatus(
            CheckoutSessionId: GetRequiredString(data, "id"),
            Status: GetString(attributes, "status") ?? string.Empty,
            CheckoutUrl: GetString(attributes, "checkout_url"),
            PaymentIntentId: GetString(attributes, "payment_intent", "id"),
            PaymentIntentStatus: GetString(attributes, "payment_intent", "attributes", "status"),
            Payments: ParsePayments(attributes));
    }

    private static async Task<JsonDocument> ReadSuccessfulResponseAsync(HttpResponseMessage response, string fallbackMessage, CancellationToken cancellationToken)
    {
        var content = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException(ExtractErrorMessage(content, fallbackMessage));
        }

        return JsonDocument.Parse(content);
    }

    private static IReadOnlyList<PayMongoPaymentRecord> ParsePayments(JsonElement attributes)
    {
        if (!attributes.TryGetProperty("payments", out var paymentsElement) || paymentsElement.ValueKind != JsonValueKind.Array)
        {
            return [];
        }

        var payments = new List<PayMongoPaymentRecord>();
        foreach (var paymentElement in paymentsElement.EnumerateArray())
        {
            if (!paymentElement.TryGetProperty("attributes", out var paymentAttributes))
            {
                continue;
            }

            payments.Add(new PayMongoPaymentRecord(
                Id: GetString(paymentElement, "id") ?? string.Empty,
                Status: GetString(paymentAttributes, "status"),
                ReferenceNumber: GetString(paymentAttributes, "reference_number")));
        }

        return payments;
    }

    private static string GetRequiredString(JsonElement element, string propertyName)
    {
        var value = GetString(element, propertyName);
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new InvalidOperationException($"PayMongo response is missing '{propertyName}'.");
        }

        return value;
    }

    private static string? GetString(JsonElement element, params string[] propertyPath)
    {
        var current = element;
        foreach (var propertyName in propertyPath)
        {
            if (current.ValueKind != JsonValueKind.Object || !current.TryGetProperty(propertyName, out var next))
            {
                return null;
            }

            current = next;
        }

        return current.ValueKind switch
        {
            JsonValueKind.Null or JsonValueKind.Undefined => null,
            JsonValueKind.String => current.GetString(),
            _ => current.ToString(),
        };
    }

    private static string ExtractErrorMessage(string payload, string fallbackMessage)
    {
        if (string.IsNullOrWhiteSpace(payload))
        {
            return fallbackMessage;
        }

        try
        {
            using var document = JsonDocument.Parse(payload);
            if (document.RootElement.TryGetProperty("errors", out var errorsElement) && errorsElement.ValueKind == JsonValueKind.Array)
            {
                foreach (var errorElement in errorsElement.EnumerateArray())
                {
                    if (errorElement.TryGetProperty("detail", out var detailElement) && detailElement.ValueKind == JsonValueKind.String)
                    {
                        var detail = detailElement.GetString();
                        if (!string.IsNullOrWhiteSpace(detail))
                        {
                            return detail;
                        }
                    }
                }
            }
        }
        catch
        {
            return fallbackMessage;
        }

        return fallbackMessage;
    }
}