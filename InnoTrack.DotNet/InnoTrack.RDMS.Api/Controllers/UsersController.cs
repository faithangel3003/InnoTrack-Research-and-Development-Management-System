using System.Security.Claims;
using InnoTrack.RDMS.Api.Application.Dtos.Users;
using InnoTrack.RDMS.Api.Application.Interfaces.Services;
using InnoTrack.RDMS.Api.Domain.Enums;
using InnoTrack.RDMS.Api.Middleware;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InnoTrack.RDMS.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController(IUserService userService) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager)]
    [ProducesResponseType(typeof(List<UserDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetUsers(CancellationToken cancellationToken)
    {
        var (actorUserId, actorRole) = GetActorContext();
        var users = await userService.GetAllUsersAsync(actorUserId, actorRole, cancellationToken);
        return Ok(users);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin)]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var (actorUserId, actorRole) = GetActorContext();
        var user = await userService.GetUserByIdAsync(id, actorUserId, actorRole, cancellationToken);
        return user is null ? NotFound() : Ok(user);
    }

    [HttpPost]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin)]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreateUserDto request, CancellationToken cancellationToken)
    {
        var (actorUserId, actorRole) = GetActorContext();
        var created = await userService.CreateUserAsync(request, actorUserId, actorRole, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin)]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateUserDto request, CancellationToken cancellationToken)
    {
        var (actorUserId, actorRole) = GetActorContext();
        var updated = await userService.UpdateUserAsync(id, request, actorUserId, actorRole, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpPatch("{id:guid}/deactivate")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin)]
    [AdminReAuth]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Deactivate(Guid id, CancellationToken cancellationToken)
    {
        var (actorUserId, actorRole) = GetActorContext();
        var success = await userService.DeactivateUserAsync(id, actorUserId, actorRole, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        return success ? NoContent() : NotFound();
    }

    [HttpPatch("{id:guid}/role")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ChangeRole(Guid id, [FromBody] ChangeRoleDto request, CancellationToken cancellationToken)
    {
        var (actorUserId, actorRole) = GetActorContext();
        var success = await userService.ChangeRoleAsync(id, request.RoleId, actorUserId, actorRole, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
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
