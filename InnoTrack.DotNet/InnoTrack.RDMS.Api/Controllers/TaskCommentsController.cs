using System.Security.Claims;
using InnoTrack.RDMS.Api.Application.Dtos.Comments;
using InnoTrack.RDMS.Api.Application.Interfaces.Services;
using InnoTrack.RDMS.Api.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InnoTrack.RDMS.Api.Controllers;

[ApiController]
[Authorize]
public class TaskCommentsController(ITaskCommentService taskCommentService) : ControllerBase
{
    [HttpGet("api/tasks/{id:guid}/comments")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager + "," + RoleNames.TeamMember)]
    public async Task<IActionResult> GetByTask(Guid id, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        var data = await taskCommentService.GetCommentsByTaskAsync(id, actorId, role, cancellationToken);
        return Ok(data);
    }

    [HttpPost("api/tasks/{id:guid}/comments")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager + "," + RoleNames.TeamMember)]
    public async Task<IActionResult> Add(Guid id, [FromBody] CreateTaskCommentDto request, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        var data = await taskCommentService.AddCommentAsync(id, request, actorId, role, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        return Created($"/api/comments/{data.Id}", data);
    }

    [HttpDelete("api/comments/{id:guid}")]
    [Authorize(Roles = RoleNames.ProjectManager + "," + RoleNames.TeamMember + "," + RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        var success = await taskCommentService.DeleteCommentAsync(id, actorId, role, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
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
