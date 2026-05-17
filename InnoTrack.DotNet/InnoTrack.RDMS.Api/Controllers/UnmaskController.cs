using System.Security.Claims;
using InnoTrack.RDMS.Api.Application.Dtos.Security;
using InnoTrack.RDMS.Api.Domain.Enums;
using InnoTrack.RDMS.Api.Security.Masking;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace InnoTrack.RDMS.Api.Controllers;

[ApiController]
[Route("api/unmask")]
[Authorize]
public class UnmaskController(IUnmaskService unmaskService) : ControllerBase
{
    [HttpPost("request")]
    [EnableRateLimiting("UnmaskPolicy")]
    public async Task<IActionResult> RequestUnmask([FromBody] RequestUnmaskDto request, CancellationToken cancellationToken)
    {
        var actorUserId = GetActorUserId();
        var result = await unmaskService.RequestUnmaskAsync(actorUserId, request, HttpContext.Connection.RemoteIpAddress?.ToString(), HttpContext.Request.Headers.UserAgent.ToString(), cancellationToken);
        return Ok(result);
    }

    [HttpPost("verify")]
    public async Task<IActionResult> Verify([FromBody] VerifyUnmaskDto request, CancellationToken cancellationToken)
    {
        var actorUserId = GetActorUserId();
        var result = await unmaskService.VerifyAndUnmaskAsync(actorUserId, request, HttpContext.Connection.RemoteIpAddress?.ToString(), HttpContext.Request.Headers.UserAgent.ToString(), cancellationToken);
        return Ok(result);
    }

    [HttpGet("logs")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin)]
    public async Task<IActionResult> GetLogs(CancellationToken cancellationToken)
    {
        return Ok(await unmaskService.GetUnmaskLogsAsync(cancellationToken));
    }

    private Guid GetActorUserId()
    {
        var actorClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(actorClaim, out var actorUserId))
        {
            throw new UnauthorizedAccessException("Invalid actor identity.");
        }

        return actorUserId;
    }
}