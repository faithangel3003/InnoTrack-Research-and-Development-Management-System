using System.Security.Claims;
using InnoTrack.RDMS.Api.Application.Dtos.Collaboration;
using InnoTrack.RDMS.Api.Application.Interfaces.Services;
using InnoTrack.RDMS.Api.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InnoTrack.RDMS.Api.Controllers;

[ApiController]
[Route("api/announcements")]
[Authorize]
public class AnnouncementsController(IAnnouncementService announcementService) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager + "," + RoleNames.TeamMember)]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        return Ok(await announcementService.GetAnnouncementsAsync(actorId, role, cancellationToken));
    }

    [HttpGet("{id:guid}")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager + "," + RoleNames.TeamMember)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        var data = await announcementService.GetAnnouncementByIdAsync(id, actorId, role, cancellationToken);
        return data is null ? NotFound() : Ok(data);
    }

    [HttpGet("unread-count")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager + "," + RoleNames.TeamMember)]
    public async Task<IActionResult> GetUnreadCount(CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        return Ok(await announcementService.GetUnreadCountAsync(actorId, role, cancellationToken));
    }

    [HttpPost]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager)]
    public async Task<IActionResult> Create([FromBody] CreateAnnouncementDto request, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        var data = await announcementService.CreateAnnouncementAsync(request, actorId, role, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = data.Id }, data);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateAnnouncementDto request, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        var data = await announcementService.UpdateAnnouncementAsync(id, request, actorId, role, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        return data is null ? NotFound() : Ok(data);
    }

    [HttpPatch("{id:guid}/publish")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager)]
    public async Task<IActionResult> Publish(Guid id, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        var data = await announcementService.PublishAnnouncementAsync(id, actorId, role, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        return data is null ? NotFound() : Ok(data);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        var deleted = await announcementService.DeleteAnnouncementAsync(id, actorId, role, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        return deleted ? NoContent() : NotFound();
    }

    [HttpPost("{id:guid}/read")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager + "," + RoleNames.TeamMember)]
    public async Task<IActionResult> MarkRead(Guid id, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        await announcementService.MarkAsReadAsync(id, actorId, role, cancellationToken);
        return NoContent();
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