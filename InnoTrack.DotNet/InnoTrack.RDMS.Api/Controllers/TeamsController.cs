using System.Security.Claims;
using InnoTrack.RDMS.Api.Application.Dtos.Teams;
using InnoTrack.RDMS.Api.Application.Interfaces.Services;
using InnoTrack.RDMS.Api.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InnoTrack.RDMS.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TeamsController(ITeamService teamService) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin)]
    [ProducesResponseType(typeof(List<TeamDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTeams([FromQuery] Guid? organizationId, CancellationToken cancellationToken)
    {
        var (actorUserId, actorRole) = GetActorContext();
        var teams = await teamService.GetTeamsAsync(actorUserId, actorRole, organizationId, cancellationToken);
        return Ok(teams);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin)]
    [ProducesResponseType(typeof(TeamDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var (actorUserId, actorRole) = GetActorContext();
        var team = await teamService.GetTeamByIdAsync(id, actorUserId, actorRole, cancellationToken);
        return team is null ? NotFound() : Ok(team);
    }

    [HttpPost]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin)]
    [ProducesResponseType(typeof(TeamDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreateTeamDto request, CancellationToken cancellationToken)
    {
        var (actorUserId, actorRole) = GetActorContext();
        var created = await teamService.CreateTeamAsync(request, actorUserId, actorRole, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin)]
    [ProducesResponseType(typeof(TeamDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTeamDto request, CancellationToken cancellationToken)
    {
        var (actorUserId, actorRole) = GetActorContext();
        var updated = await teamService.UpdateTeamAsync(id, request, actorUserId, actorRole, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var (actorUserId, actorRole) = GetActorContext();
        var success = await teamService.DeleteTeamAsync(id, actorUserId, actorRole, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        return success ? NoContent() : NotFound();
    }

    private (Guid ActorUserId, string ActorRole) GetActorContext()
    {
        var actorClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var roleClaim = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
        if (!Guid.TryParse(actorClaim, out var actorUserId))
        {
            throw new UnauthorizedAccessException("Invalid actor identity");
        }

        return (actorUserId, roleClaim);
    }
}