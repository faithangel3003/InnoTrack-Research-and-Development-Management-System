using InnoTrack.RDMS.Api.Application.Dtos.Auth;
using InnoTrack.RDMS.Api.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using System.Security.Claims;

namespace InnoTrack.RDMS.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(
    IAuthService authService,
    IRecaptchaVerificationService recaptchaVerificationService,
    ILoginCaptchaService loginCaptchaService) : ControllerBase
{
    [HttpPost("login/precheck")]
    [AllowAnonymous]
    [EnableRateLimiting("LoginPrecheckPolicy")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> PrecheckLogin([FromBody] LoginPrecheckRequestDto request, CancellationToken cancellationToken)
    {
        var remoteIp = HttpContext.Connection.RemoteIpAddress?.ToString();
        await recaptchaVerificationService.ValidateAsync(request.CaptchaToken, remoteIp, cancellationToken);

        await authService.ValidateCredentialsAsync(request, remoteIp, HttpContext.Request.Headers.UserAgent.ToString(), cancellationToken);
        return NoContent();
    }

    [HttpGet("login-captcha")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(LoginCaptchaChallengeDto), StatusCodes.Status200OK)]
    public IActionResult GetLoginCaptchaChallenge()
    {
        Response.Headers.CacheControl = "no-store, no-cache, must-revalidate";
        Response.Headers.Pragma = "no-cache";
        return Ok(loginCaptchaService.CreateChallenge(HttpContext.Connection.RemoteIpAddress?.ToString()));
    }

    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting("LoginPolicy")]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginRequestDto request, CancellationToken cancellationToken)
    {
        var remoteIp = HttpContext.Connection.RemoteIpAddress?.ToString();

        if (!string.IsNullOrWhiteSpace(request.CaptchaChallengeId))
        {
            await loginCaptchaService.ValidateAsync(request.CaptchaChallengeId, request.CaptchaToken, remoteIp, cancellationToken);
        }
        else
        {
            await recaptchaVerificationService.ValidateAsync(request.CaptchaToken, remoteIp, cancellationToken);
        }

        var response = await authService.LoginAsync(request, remoteIp, HttpContext.Request.Headers.UserAgent.ToString(), cancellationToken);
        return Ok(response);
    }

    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(typeof(CurrentUserProfileDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetCurrentUser(CancellationToken cancellationToken)
    {
        var actorClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(actorClaim, out var userId))
        {
            throw new UnauthorizedAccessException("Invalid actor identity");
        }

        var profile = await authService.GetCurrentUserAsync(userId, cancellationToken);
        return profile is null ? NotFound() : Ok(profile);
    }

    [HttpPut("profile")]
    [Authorize]
    [ProducesResponseType(typeof(CurrentUserProfileDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequestDto request, CancellationToken cancellationToken)
    {
        var actorClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(actorClaim, out var userId))
        {
            throw new UnauthorizedAccessException("Invalid actor identity");
        }

        var profile = await authService.UpdateProfileAsync(userId, request, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        return profile is null ? NotFound() : Ok(profile);
    }

    [HttpGet("security-question")]
    [Authorize]
    [ProducesResponseType(typeof(SecurityQuestionStateDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSecurityQuestion(CancellationToken cancellationToken)
    {
        var actorClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(actorClaim, out var userId))
        {
            throw new UnauthorizedAccessException("Invalid actor identity");
        }

        return Ok(await authService.GetSecurityQuestionAsync(userId, cancellationToken));
    }

    [HttpPut("security-question")]
    [Authorize]
    [ProducesResponseType(typeof(SecurityQuestionStateDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateSecurityQuestion([FromBody] UpdateSecurityQuestionRequestDto request, CancellationToken cancellationToken)
    {
        var actorClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(actorClaim, out var userId))
        {
            throw new UnauthorizedAccessException("Invalid actor identity");
        }

        return Ok(await authService.UpdateSecurityQuestionAsync(userId, request, HttpContext.Connection.RemoteIpAddress?.ToString(), HttpContext.Request.Headers.UserAgent.ToString(), cancellationToken));
    }

    [HttpPost("forgot-password/question")]
    [AllowAnonymous]
    [EnableRateLimiting("LoginPolicy")]
    [ProducesResponseType(typeof(ForgotPasswordQuestionResponseDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetForgotPasswordQuestion([FromBody] ForgotPasswordQuestionRequestDto request, CancellationToken cancellationToken)
    {
        return Ok(await authService.GetForgotPasswordQuestionAsync(request, cancellationToken));
    }

    [HttpPost("forgot-password/reset")]
    [AllowAnonymous]
    [EnableRateLimiting("LoginPolicy")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> ResetPasswordWithSecurityQuestion([FromBody] ForgotPasswordResetRequestDto request, CancellationToken cancellationToken)
    {
        await authService.ResetPasswordWithSecurityQuestionAsync(request, HttpContext.Connection.RemoteIpAddress?.ToString(), HttpContext.Request.Headers.UserAgent.ToString(), cancellationToken);
        return NoContent();
    }

    [HttpPost("change-password")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequestDto request, CancellationToken cancellationToken)
    {
        var actorClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(actorClaim, out var userId))
        {
            throw new UnauthorizedAccessException("Invalid actor identity");
        }

        await authService.ChangePasswordAsync(userId, request, HttpContext.Connection.RemoteIpAddress?.ToString(), HttpContext.Request.Headers.UserAgent.ToString(), cancellationToken);
        return NoContent();
    }

    [HttpPost("logout")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Logout(CancellationToken cancellationToken)
    {
        var actorClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(actorClaim, out var userId))
        {
            throw new UnauthorizedAccessException("Invalid actor identity");
        }

        await authService.LogoutAsync(userId, HttpContext.Connection.RemoteIpAddress?.ToString(), HttpContext.Request.Headers.UserAgent.ToString(), cancellationToken);
        return NoContent();
    }
}
