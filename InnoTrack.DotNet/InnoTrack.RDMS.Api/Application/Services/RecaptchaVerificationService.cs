using System.Text.Json.Serialization;
using InnoTrack.RDMS.Api.Application.Interfaces.Services;
using InnoTrack.RDMS.Api.Configuration;
using Microsoft.Extensions.Options;

namespace InnoTrack.RDMS.Api.Application.Services;

public class RecaptchaVerificationService(
    IHttpClientFactory httpClientFactory,
    IOptions<RecaptchaOptions> options,
    ILogger<RecaptchaVerificationService> logger) : IRecaptchaVerificationService
{
    private const string GoogleRecaptchaTestSecretKey = "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe";
    private readonly RecaptchaOptions _options = options.Value;

    public async Task ValidateAsync(string token, string? remoteIp, CancellationToken cancellationToken = default)
    {
        if (!_options.Enabled)
        {
            logger.LogInformation("Skipping reCAPTCHA verification because it is disabled by configuration.");
            return;
        }

        if (string.IsNullOrWhiteSpace(token))
        {
            throw new InvalidOperationException("reCAPTCHA token is required.");
        }

        if (string.IsNullOrWhiteSpace(_options.SecretKey))
        {
            throw new InvalidOperationException("reCAPTCHA secret key is not configured.");
        }

        if (string.Equals(_options.SecretKey, GoogleRecaptchaTestSecretKey, StringComparison.Ordinal))
        {
            logger.LogInformation("Skipping remote reCAPTCHA verification because the official Google test secret is configured.");
            return;
        }

        var content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["secret"] = _options.SecretKey,
            ["response"] = token,
            ["remoteip"] = remoteIp ?? string.Empty,
        });

        var client = httpClientFactory.CreateClient("Recaptcha");
        var response = await client.PostAsync(_options.VerifyUrl, content, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            logger.LogWarning("reCAPTCHA verification call failed with status code {StatusCode}", (int)response.StatusCode);
            throw new InvalidOperationException("Unable to verify reCAPTCHA. Please try again.");
        }

        var payload = await response.Content.ReadFromJsonAsync<RecaptchaVerifyResponse>(cancellationToken: cancellationToken);
        if (payload is null || !payload.Success)
        {
            var errorCodes = payload?.ErrorCodes is { Count: > 0 }
                ? string.Join(",", payload.ErrorCodes)
                : "none";
            logger.LogWarning("reCAPTCHA validation failed. Error codes: {ErrorCodes}", errorCodes);
            throw new InvalidOperationException("reCAPTCHA validation failed. Please try again.");
        }
    }

    private sealed class RecaptchaVerifyResponse
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }

        [JsonPropertyName("error-codes")]
        public List<string>? ErrorCodes { get; set; }
    }
}
