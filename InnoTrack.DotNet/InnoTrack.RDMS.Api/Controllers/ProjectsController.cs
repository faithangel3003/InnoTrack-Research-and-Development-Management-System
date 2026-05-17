using System.Security.Claims;
using InnoTrack.RDMS.Api.Application.Dtos.Members;
using InnoTrack.RDMS.Api.Application.Dtos.Projects;
using InnoTrack.RDMS.Api.Application.Interfaces.Services;
using InnoTrack.RDMS.Api.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InnoTrack.RDMS.Api.Controllers;

[ApiController]
[Route("api/projects")]
[Authorize]
public class ProjectsController(IProjectService projectService, IProjectMemberService projectMemberService) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager + "," + RoleNames.TeamMember)]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        var data = await projectService.GetAllProjectsAsync(actorId, role, cancellationToken);
        return Ok(data);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager + "," + RoleNames.TeamMember)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        var data = await projectService.GetProjectByIdAsync(id, actorId, role, cancellationToken);
        return data is null ? NotFound() : Ok(data);
    }

    [HttpGet("{id:guid}/summary")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager + "," + RoleNames.TeamMember)]
    public async Task<IActionResult> GetSummary(Guid id, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        var data = await projectService.GetProjectSummaryAsync(id, actorId, role, cancellationToken);
        return data is null ? NotFound() : Ok(data);
    }

    [HttpPost]
    [Authorize(Roles = RoleNames.SystemAdmin + "," + RoleNames.ProjectManager)]
    public async Task<IActionResult> Create([FromBody] CreateProjectDto request, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        var data = await projectService.CreateProjectAsync(request, actorId, role, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = data.Id }, data);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = RoleNames.SystemAdmin + "," + RoleNames.ProjectManager)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateProjectDto request, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        var data = await projectService.UpdateProjectAsync(id, request, actorId, role, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        return data is null ? NotFound() : Ok(data);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = RoleNames.SystemAdmin + "," + RoleNames.ProjectManager + "," + RoleNames.SuperAdmin)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        var success = await projectService.DeleteProjectAsync(id, actorId, role, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        return success ? NoContent() : NotFound();
    }

    [HttpPatch("{id:guid}/status")]
    [Authorize(Roles = RoleNames.SystemAdmin + "," + RoleNames.ProjectManager)]
    public async Task<IActionResult> ChangeStatus(Guid id, [FromBody] ChangeProjectStatusDto request, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        var data = await projectService.ChangeProjectStatusAsync(id, request, actorId, role, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        return data is null ? NotFound() : Ok(data);
    }

    [HttpGet("{id:guid}/members")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager + "," + RoleNames.TeamMember)]
    public async Task<IActionResult> GetMembers(Guid id, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        var data = await projectMemberService.GetMembersAsync(id, actorId, role, cancellationToken);
        return Ok(data);
    }

    [HttpPost("{id:guid}/members")]
    [Authorize(Roles = RoleNames.SystemAdmin + "," + RoleNames.ProjectManager)]
    public async Task<IActionResult> AddMember(Guid id, [FromBody] AddProjectMemberDto request, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        var data = await projectMemberService.AddMemberAsync(id, request, actorId, role, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        return Created($"/api/projects/{id}/members/{data.UserId}", data);
    }

    [HttpDelete("{id:guid}/members/{uid:guid}")]
    [Authorize(Roles = RoleNames.SystemAdmin + "," + RoleNames.ProjectManager)]
    public async Task<IActionResult> RemoveMember(Guid id, Guid uid, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        var success = await projectMemberService.RemoveMemberAsync(id, uid, actorId, role, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
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
