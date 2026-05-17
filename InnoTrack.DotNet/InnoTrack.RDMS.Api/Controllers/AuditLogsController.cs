using InnoTrack.RDMS.Api.Application.Dtos.AuditLogs;
using InnoTrack.RDMS.Api.Application.Interfaces.Services;
using InnoTrack.RDMS.Api.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace InnoTrack.RDMS.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AuditLogsController(IAuditLogService auditLogService) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin)]
    [ProducesResponseType(typeof(List<AuditLogDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll([FromQuery] int pageSize = 50, CancellationToken cancellationToken = default)
    {
        var (_, actorRole, actorOrganizationId) = GetActorContext();
        var logs = await auditLogService.GetAllLogsAsync(actorRole, actorOrganizationId, pageSize, cancellationToken);
        return Ok(logs);
    }

    [HttpGet("{userId:guid}")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin)]
    [ProducesResponseType(typeof(List<AuditLogDto>), StatusCodes.Status200OK)]
    public Task<IActionResult> GetByUser(Guid userId, [FromQuery] int pageSize = 50, CancellationToken cancellationToken = default)
    {
        return GetByUserInternal(userId, pageSize, cancellationToken);
    }

    [HttpGet("user/{userId:guid}")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin)]
    [ProducesResponseType(typeof(List<AuditLogDto>), StatusCodes.Status200OK)]
    public Task<IActionResult> GetByUserLegacy(Guid userId, [FromQuery] int pageSize = 50, CancellationToken cancellationToken = default)
    {
        return GetByUserInternal(userId, pageSize, cancellationToken);
    }

    private async Task<IActionResult> GetByUserInternal(Guid userId, int pageSize, CancellationToken cancellationToken)
    {
        var logs = await auditLogService.GetLogsByUserAsync(userId, pageSize, cancellationToken);
        return Ok(logs);
    }

    private (Guid ActorUserId, string ActorRole, Guid? ActorOrganizationId) GetActorContext()
    {
        var actorClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var roleClaim = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
        var organizationClaim = User.FindFirstValue("organization_id");

        if (!Guid.TryParse(actorClaim, out var actorUserId))
        {
            throw new UnauthorizedAccessException("Invalid actor identity");
        }

        return (actorUserId, roleClaim, Guid.TryParse(organizationClaim, out var organizationId) ? organizationId : null);
    }
}
