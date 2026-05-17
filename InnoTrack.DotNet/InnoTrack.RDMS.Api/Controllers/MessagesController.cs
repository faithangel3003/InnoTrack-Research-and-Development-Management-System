using System.Security.Claims;
using InnoTrack.RDMS.Api.Application.Dtos.Collaboration;
using InnoTrack.RDMS.Api.Application.Interfaces.Services;
using InnoTrack.RDMS.Api.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InnoTrack.RDMS.Api.Controllers;

[ApiController]
[Authorize]
public class MessagesController(
    IMessageService messageService,
    IMessageReactionService messageReactionService,
    IChannelService channelService) : ControllerBase
{
    [HttpGet("/api/channels/{id:guid}/messages")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager + "," + RoleNames.TeamMember)]
    public async Task<IActionResult> GetMessages(Guid id, [FromQuery] int skip, [FromQuery] int take = 100, CancellationToken cancellationToken = default)
    {
        var (actorId, role) = GetActorContext();
        return Ok(await messageService.GetChannelMessagesAsync(id, actorId, role, skip, take, cancellationToken));
    }

    [HttpGet("/api/messages/{id:guid}/thread")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager + "," + RoleNames.TeamMember)]
    public async Task<IActionResult> GetThread(Guid id, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        var data = await messageService.GetThreadMessagesAsync(id, actorId, role, cancellationToken);
        return data is null ? NotFound() : Ok(data);
    }

    [HttpGet("/api/channels/{id:guid}/pinned")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager + "," + RoleNames.TeamMember)]
    public async Task<IActionResult> GetPinned(Guid id, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        return Ok(await messageService.GetPinnedMessagesAsync(id, actorId, role, cancellationToken));
    }

    [HttpGet("/api/channels/{id:guid}/search")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager + "," + RoleNames.TeamMember)]
    public async Task<IActionResult> Search(Guid id, [FromQuery(Name = "q")] string query, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        return Ok(await messageService.SearchMessagesAsync(id, query, actorId, role, cancellationToken));
    }

    [HttpPost("/api/channels/{id:guid}/messages")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager + "," + RoleNames.TeamMember)]
    public async Task<IActionResult> Send(Guid id, [FromBody] SendMessageDto request, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        var data = await messageService.SendMessageAsync(id, request, actorId, role, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        return Ok(data);
    }

    [HttpPut("/api/messages/{id:guid}")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager + "," + RoleNames.TeamMember)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateMessageDto request, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        var data = await messageService.EditMessageAsync(id, request, actorId, role, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        return data is null ? NotFound() : Ok(data);
    }

    [HttpDelete("/api/messages/{id:guid}")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager + "," + RoleNames.TeamMember)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        var deleted = await messageService.DeleteMessageAsync(id, actorId, role, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        return deleted ? NoContent() : NotFound();
    }

    [HttpPatch("/api/messages/{id:guid}/pin")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager)]
    public async Task<IActionResult> Pin(Guid id, [FromQuery] bool pinned = true, CancellationToken cancellationToken = default)
    {
        var (actorId, role) = GetActorContext();
        var data = await messageService.PinMessageAsync(id, pinned, actorId, role, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        return data is null ? NotFound() : Ok(data);
    }

    [HttpPost("/api/messages/{id:guid}/reactions")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager + "," + RoleNames.TeamMember)]
    public async Task<IActionResult> AddReaction(Guid id, [FromBody] AddReactionDto request, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        return Ok(await messageReactionService.AddReactionAsync(id, request, actorId, role, cancellationToken));
    }

    [HttpDelete("/api/messages/{id:guid}/reactions/{emoji}")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager + "," + RoleNames.TeamMember)]
    public async Task<IActionResult> RemoveReaction(Guid id, string emoji, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        return Ok(await messageReactionService.RemoveReactionAsync(id, emoji, actorId, role, cancellationToken));
    }

    [HttpPatch("/api/channels/{id:guid}/read")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager + "," + RoleNames.TeamMember)]
    public async Task<IActionResult> MarkChannelRead(Guid id, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        await channelService.MarkChannelAsReadAsync(id, actorId, role, cancellationToken);
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