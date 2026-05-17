using InnoTrack.RDMS.Api.Application.Dtos.Auth;
using InnoTrack.RDMS.Api.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Primitives;

namespace InnoTrack.RDMS.Api.Controllers;

[ApiController]
[Route("api/public/onboarding")]
[AllowAnonymous]
public class PublicOnboardingController(
    IPublicOnboardingService publicOnboardingService,
    IRecaptchaVerificationService recaptchaVerificationService,
    ILoginCaptchaService loginCaptchaService,
    IConfiguration configuration) : ControllerBase
{
    [HttpPost("checkout")]
    [ProducesResponseType(typeof(PublicOnboardingCheckoutSessionResponseDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreateCheckout([FromBody] PublicOnboardingRequestDto request, CancellationToken cancellationToken)
    {
        var remoteIp = HttpContext.Connection.RemoteIpAddress?.ToString();
        await ValidateCaptchaAsync(request.CaptchaChallengeId, request.CaptchaToken, remoteIp, cancellationToken);

        var result = await publicOnboardingService.CreateCheckoutSessionAsync(request, remoteIp, ResolveClientBaseUrl(), cancellationToken);
        return Ok(result);
    }

    [HttpPost("checkout/{pendingOnboardingId:guid}/retry")]
    [ProducesResponseType(typeof(PublicOnboardingCheckoutSessionResponseDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> RetryCheckout(Guid pendingOnboardingId, [FromBody] RetryPublicOnboardingCheckoutRequestDto request, CancellationToken cancellationToken)
    {
        var remoteIp = HttpContext.Connection.RemoteIpAddress?.ToString();
        await ValidateCaptchaAsync(request.CaptchaChallengeId, request.CaptchaToken, remoteIp, cancellationToken);

        var result = await publicOnboardingService.RetryCheckoutSessionAsync(pendingOnboardingId, request, remoteIp, ResolveClientBaseUrl(), cancellationToken);
        return Ok(result);
    }

    [HttpPost("complete")]
    [ProducesResponseType(typeof(PublicOnboardingResponseDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Complete([FromBody] CompletePublicOnboardingRequestDto request, CancellationToken cancellationToken)
    {
        var remoteIp = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await publicOnboardingService.CompleteOnboardingAsync(request.PendingOnboardingId, remoteIp, cancellationToken);
        return Ok(result);
    }

    private async Task ValidateCaptchaAsync(string? captchaChallengeId, string captchaToken, string? remoteIp, CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(captchaChallengeId))
        {
            await loginCaptchaService.ValidateAsync(captchaChallengeId, captchaToken, remoteIp, cancellationToken);
            return;
        }

        await recaptchaVerificationService.ValidateAsync(captchaToken, remoteIp, cancellationToken);
    }

    private string ResolveClientBaseUrl()
    {
        var allowedOrigins = configuration.GetSection("AllowedOrigins").Get<string[]>() ?? [];

        if (TryResolveAllowedOrigin(Request.Headers.Origin, allowedOrigins, out var origin))
        {
            return origin;
        }

        if (Uri.TryCreate(Request.Headers.Referer.ToString(), UriKind.Absolute, out var refererUri))
        {
            var refererOrigin = $"{refererUri.Scheme}://{refererUri.Authority}";
            if (TryResolveAllowedOrigin(new StringValues(refererOrigin), allowedOrigins, out origin))
            {
                return origin;
            }
        }

        var fallback = configuration["ClientUrl"] ?? allowedOrigins.FirstOrDefault() ?? "http://localhost:5174";
        return fallback.TrimEnd('/');
    }

    private static bool TryResolveAllowedOrigin(StringValues candidates, string[] allowedOrigins, out string origin)
    {
        foreach (var candidate in candidates)
        {
            if (string.IsNullOrWhiteSpace(candidate))
            {
                continue;
            }

            var normalizedCandidate = candidate.TrimEnd('/');
            if (allowedOrigins.Any(allowed => string.Equals(allowed.TrimEnd('/'), normalizedCandidate, StringComparison.OrdinalIgnoreCase)))
            {
                origin = normalizedCandidate;
                return true;
            }
        }

        origin = string.Empty;
        return false;
    }
}