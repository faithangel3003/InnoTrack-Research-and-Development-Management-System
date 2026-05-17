using System.Security.Claims;
using InnoTrack.RDMS.Api.Application.Dtos.Milestones;
using InnoTrack.RDMS.Api.Application.Interfaces.Services;
using InnoTrack.RDMS.Api.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InnoTrack.RDMS.Api.Controllers;

[ApiController]
[Authorize]
public class MilestonesController(IMilestoneService milestoneService) : ControllerBase
{
    [HttpGet("api/projects/{id:guid}/milestones")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager + "," + RoleNames.TeamMember)]
    public async Task<IActionResult> GetByProject(Guid id, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        var data = await milestoneService.GetMilestonesByProjectAsync(id, actorId, role, cancellationToken);
        return Ok(data);
    }

    [HttpPost("api/projects/{id:guid}/milestones")]
    [Authorize(Roles = RoleNames.ProjectManager)]
    public async Task<IActionResult> Create(Guid id, [FromBody] CreateMilestoneDto request, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        var data = await milestoneService.CreateMilestoneAsync(id, request, actorId, role, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        return Created($"/api/milestones/{data.Id}", data);
    }

    [HttpPatch("api/milestones/{id:guid}/complete")]
    [Authorize(Roles = RoleNames.ProjectManager)]
    public async Task<IActionResult> Complete(Guid id, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        var data = await milestoneService.CompleteMilestoneAsync(id, actorId, role, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        return data is null ? NotFound() : Ok(data);
    }

    [HttpDelete("api/milestones/{id:guid}")]
    [Authorize(Roles = RoleNames.ProjectManager)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        var success = await milestoneService.DeleteMilestoneAsync(id, actorId, role, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        return success ? NoContent() : NotFound();
    }

    private (Guid ActorId, string Role) GetActorContext()
    {
        var actorClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var roleClaim = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;

        if (!Guid.TryParse(actorClaim, out var actorId))
        {
            throw new UnauthorizedAccessException("Invalid actor identity");
        }

        return (actorId, roleClaim);
    }
}
