using System.Security.Claims;
using InnoTrack.RDMS.Api.Application.Dtos.SuperAdmin;
using InnoTrack.RDMS.Api.Application.Interfaces.Services;
using InnoTrack.RDMS.Api.Domain.Enums;
using InnoTrack.RDMS.Api.Middleware;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InnoTrack.RDMS.Api.Controllers;

[ApiController]
[Route("api/companies")]
[Authorize(Roles = RoleNames.SuperAdmin)]
public class CompaniesController(ISuperAdminPortalService portalService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] CompanyQueryDto query, CancellationToken cancellationToken)
    {
        var result = await portalService.GetCompaniesAsync(query, cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var result = await portalService.GetCompanyByIdAsync(id, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCompanyDto request, CancellationToken cancellationToken)
    {
        var actorId = GetActorUserId();
        var result = await portalService.CreateCompanyAsync(request, actorId, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateCompanyDto request, CancellationToken cancellationToken)
    {
        var actorId = GetActorUserId();
        var result = await portalService.UpdateCompanyAsync(id, request, actorId, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpDelete("{id:guid}")]
    [AdminReAuth]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var actorId = GetActorUserId();
        var success = await portalService.DeleteCompanyAsync(id, actorId, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        return success ? NoContent() : NotFound();
    }

    [HttpPatch("{id:guid}/approve")]
    public async Task<IActionResult> Approve(Guid id, CancellationToken cancellationToken)
    {
        var actorId = GetActorUserId();
        var success = await portalService.ApproveCompanyAsync(id, actorId, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        return success ? NoContent() : NotFound();
    }

    [HttpPatch("{id:guid}/activate")]
    public async Task<IActionResult> Activate(Guid id, CancellationToken cancellationToken)
    {
        var actorId = GetActorUserId();
        var success = await portalService.SetCompanyActiveStateAsync(id, true, actorId, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        return success ? NoContent() : NotFound();
    }

    [HttpPatch("{id:guid}/deactivate")]
    [AdminReAuth]
    public async Task<IActionResult> Deactivate(Guid id, CancellationToken cancellationToken)
    {
        var actorId = GetActorUserId();
        var success = await portalService.SetCompanyActiveStateAsync(id, false, actorId, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        return success ? NoContent() : NotFound();
    }

    private Guid GetActorUserId()
    {
        var actorClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(actorClaim, out var actorUserId))
        {
            throw new UnauthorizedAccessException("Invalid actor identity");
        }

        return actorUserId;
    }
}