using System.Security.Claims;
using InnoTrack.RDMS.Api.Application.Interfaces.Services;
using InnoTrack.RDMS.Api.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InnoTrack.RDMS.Api.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController(INotificationService notificationService) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager + "," + RoleNames.TeamMember)]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        var actorId = GetActorId();
        return Ok(await notificationService.GetUserNotificationsAsync(actorId, cancellationToken));
    }

    [HttpGet("unread-count")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager + "," + RoleNames.TeamMember)]
    public async Task<IActionResult> GetUnreadCount(CancellationToken cancellationToken)
    {
        var actorId = GetActorId();
        return Ok(await notificationService.GetUnreadCountAsync(actorId, cancellationToken));
    }

    [HttpPatch("{id:guid}/read")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager + "," + RoleNames.TeamMember)]
    public async Task<IActionResult> MarkRead(Guid id, CancellationToken cancellationToken)
    {
        var actorId = GetActorId();
        var data = await notificationService.MarkAsReadAsync(id, actorId, cancellationToken);
        return data is null ? NotFound() : Ok(data);
    }

    [HttpPatch("read-all")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager + "," + RoleNames.TeamMember)]
    public async Task<IActionResult> MarkAllRead(CancellationToken cancellationToken)
    {
        var actorId = GetActorId();
        await notificationService.MarkAllAsReadAsync(actorId, cancellationToken);
        return NoContent();
    }

    private Guid GetActorId()
    {
        var actorClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(actorClaim, out var actorId))
        {
            throw new UnauthorizedAccessException("Invalid actor identity");
        }

        return actorId;
    }
}