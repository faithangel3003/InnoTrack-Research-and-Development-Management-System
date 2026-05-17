using System.Security.Claims;
using InnoTrack.RDMS.Api.Application.Dtos.Collaboration;
using InnoTrack.RDMS.Api.Application.Interfaces.Services;
using InnoTrack.RDMS.Api.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InnoTrack.RDMS.Api.Controllers;

[ApiController]
[Route("api/channels")]
[Authorize]
public class ChannelsController(IChannelService channelService) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager + "," + RoleNames.TeamMember)]
    public async Task<IActionResult> GetChannels(CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        return Ok(await channelService.GetUserChannelsAsync(actorId, role, cancellationToken));
    }

    [HttpGet("{id:guid}")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager + "," + RoleNames.TeamMember)]
    public async Task<IActionResult> GetChannel(Guid id, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        var data = await channelService.GetChannelByIdAsync(id, actorId, role, cancellationToken);
        return data is null ? NotFound() : Ok(data);
    }

    [HttpGet("{id:guid}/members")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager + "," + RoleNames.TeamMember)]
    public async Task<IActionResult> GetMembers(Guid id, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        return Ok(await channelService.GetMembersAsync(id, actorId, role, cancellationToken));
    }

    [HttpGet("/api/projects/{id:guid}/channels")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager + "," + RoleNames.TeamMember)]
    public async Task<IActionResult> GetProjectChannels(Guid id, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        return Ok(await channelService.GetProjectChannelsAsync(id, actorId, role, cancellationToken));
    }

    [HttpPost]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager)]
    public async Task<IActionResult> CreateChannel([FromBody] CreateChannelDto request, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        var data = await channelService.CreateChannelAsync(request, actorId, role, cancellationToken);
        return CreatedAtAction(nameof(GetChannel), new { id = data.Id }, data);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager)]
    public async Task<IActionResult> UpdateChannel(Guid id, [FromBody] UpdateChannelDto request, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        var data = await channelService.UpdateChannelAsync(id, request, actorId, role, cancellationToken);
        return data is null ? NotFound() : Ok(data);
    }

    [HttpPatch("{id:guid}/archive")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager)]
    public async Task<IActionResult> ArchiveChannel(Guid id, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        var data = await channelService.ArchiveChannelAsync(id, actorId, role, cancellationToken);
        return data is null ? NotFound() : Ok(data);
    }

    [HttpPost("{id:guid}/members")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager)]
    public async Task<IActionResult> AddMember(Guid id, [FromBody] AddChannelMemberDto request, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        return Ok(await channelService.AddMemberAsync(id, request, actorId, role, cancellationToken));
    }

    [HttpDelete("{id:guid}/members/{userId:guid}")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager)]
    public async Task<IActionResult> RemoveMember(Guid id, Guid userId, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        var removed = await channelService.RemoveMemberAsync(id, userId, actorId, role, cancellationToken);
        return removed ? NoContent() : NotFound();
    }

    [HttpPost("direct")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager + "," + RoleNames.TeamMember)]
    public async Task<IActionResult> CreateDirectChannel([FromBody] CreateDirectChannelDto request, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        return Ok(await channelService.GetOrCreateDirectMessageChannelAsync(actorId, role, request.TargetUserId, cancellationToken));
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