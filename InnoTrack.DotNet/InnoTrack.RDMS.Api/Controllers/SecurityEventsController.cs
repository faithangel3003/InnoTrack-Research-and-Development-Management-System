using InnoTrack.RDMS.Api.Application.Dtos.Security;
using InnoTrack.RDMS.Api.Domain.Enums;
using InnoTrack.RDMS.Api.Security.Events;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InnoTrack.RDMS.Api.Controllers;

[ApiController]
[Route("api/security-events")]
[Authorize]
public class SecurityEventsController(ISecurityEventService securityEventService) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = RoleNames.SuperAdmin)]
    public async Task<IActionResult> GetAll([FromQuery] SecurityEventQueryDto query, CancellationToken cancellationToken)
    {
        return Ok(await securityEventService.GetSecurityEventsAsync(query, cancellationToken));
    }

    [HttpGet("{userId:guid}")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin)]
    public async Task<IActionResult> GetByUser(Guid userId, CancellationToken cancellationToken)
    {
        return Ok(await securityEventService.GetEventsByUserAsync(userId, cancellationToken));
    }

    [HttpGet("high")]
    [Authorize(Roles = RoleNames.SuperAdmin)]
    public async Task<IActionResult> GetHighSeverity([FromQuery] DateTime? since, CancellationToken cancellationToken)
    {
        return Ok(await securityEventService.GetHighSeverityEventsAsync(since, cancellationToken));
    }
}