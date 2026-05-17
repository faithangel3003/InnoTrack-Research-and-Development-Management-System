using System.Security.Claims;
using InnoTrack.RDMS.Api.Application.Dtos.Tasks;
using InnoTrack.RDMS.Api.Application.Interfaces.Services;
using InnoTrack.RDMS.Api.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InnoTrack.RDMS.Api.Controllers;

[ApiController]
[Authorize]
public class TasksController(ITaskService taskService) : ControllerBase
{
    [HttpGet("api/projects/{id:guid}/tasks")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager + "," + RoleNames.TeamMember)]
    public async Task<IActionResult> GetByProject(Guid id, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        var data = await taskService.GetTasksByProjectAsync(id, actorId, role, cancellationToken);
        return Ok(data);
    }

    [HttpGet("api/tasks/{id:guid}")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager + "," + RoleNames.TeamMember)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        var data = await taskService.GetTaskByIdAsync(id, actorId, role, cancellationToken);
        return data is null ? NotFound() : Ok(data);
    }

    [HttpGet("api/tasks/my")]
    [Authorize(Roles = RoleNames.TeamMember)]
    public async Task<IActionResult> GetMy(CancellationToken cancellationToken)
    {
        var (actorId, _) = GetActorContext();
        var data = await taskService.GetMyTasksAsync(actorId, cancellationToken);
        return Ok(data);
    }

    [HttpPost("api/projects/{id:guid}/tasks")]
    [Authorize(Roles = RoleNames.SystemAdmin + "," + RoleNames.ProjectManager)]
    public async Task<IActionResult> Create(Guid id, [FromBody] CreateTaskDto request, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        var data = await taskService.CreateTaskAsync(id, request, actorId, role, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        return Created($"/api/tasks/{data.Id}", data);
    }

    [HttpPut("api/tasks/{id:guid}")]
    [Authorize(Roles = RoleNames.SystemAdmin + "," + RoleNames.ProjectManager)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTaskDto request, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        var data = await taskService.UpdateTaskAsync(id, request, actorId, role, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        return data is null ? NotFound() : Ok(data);
    }

    [HttpPatch("api/tasks/{id:guid}/status")]
    [Authorize(Roles = RoleNames.SystemAdmin + "," + RoleNames.TeamMember + "," + RoleNames.ProjectManager)]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateTaskStatusDto request, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        var data = await taskService.UpdateTaskStatusAsync(id, request, actorId, role, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        return data is null ? NotFound() : Ok(data);
    }

    [HttpDelete("api/tasks/{id:guid}")]
    [Authorize(Roles = RoleNames.SystemAdmin + "," + RoleNames.ProjectManager)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        var success = await taskService.DeleteTaskAsync(id, actorId, role, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
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
