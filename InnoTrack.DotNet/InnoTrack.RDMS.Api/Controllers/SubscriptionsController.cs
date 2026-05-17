using System.Security.Claims;
using InnoTrack.RDMS.Api.Application.Dtos.SuperAdmin;
using InnoTrack.RDMS.Api.Application.Interfaces.Services;
using InnoTrack.RDMS.Api.Domain.Enums;
using InnoTrack.RDMS.Api.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InnoTrack.RDMS.Api.Controllers;

[ApiController]
[Route("api/subscriptions")]
[Authorize]
public class SubscriptionsController(ISuperAdminPortalService portalService, AppDbContext dbContext) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = RoleNames.SuperAdmin)]
    public async Task<IActionResult> GetAll([FromQuery] SubscriptionQueryDto query, CancellationToken cancellationToken)
    {
        var result = await portalService.GetSubscriptionsAsync(query, cancellationToken);
        return Ok(result);
    }

    [HttpGet("summary")]
    [Authorize(Roles = RoleNames.SuperAdmin)]
    public async Task<IActionResult> GetSummary(CancellationToken cancellationToken)
    {
        var result = await portalService.GetSubscriptionSummaryAsync(cancellationToken);
        return Ok(result);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = RoleNames.SuperAdmin)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateSubscriptionDto request, CancellationToken cancellationToken)
    {
        var actorId = GetActorUserId();
        var result = await portalService.UpdateSubscriptionAsync(id, request, actorId, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpGet("current")]
    [Authorize(Roles = RoleNames.SystemAdmin + "," + RoleNames.ProjectManager + "," + RoleNames.TeamMember)]
    public async Task<IActionResult> GetCurrent(CancellationToken cancellationToken)
    {
        var actorId = GetActorUserId();
        var organizationId = await dbContext.Users
            .Where(user => user.Id == actorId)
            .Select(user => user.OrganizationId)
            .FirstOrDefaultAsync(cancellationToken);

        if (!organizationId.HasValue)
        {
            return NotFound();
        }

        var subscription = await dbContext.OrganizationSubscriptions
            .Include(subscription => subscription.Organization)
            .Where(subscription => subscription.OrganizationId == organizationId.Value)
            .OrderByDescending(subscription => subscription.StartDate)
            .FirstOrDefaultAsync(cancellationToken);

        if (subscription is null)
        {
            return NotFound();
        }

        return Ok(new SubscriptionItemDto
        {
            Id = subscription.Id,
            CompanyId = subscription.OrganizationId,
            CompanyName = subscription.Organization.Name,
            CompanyEmail = subscription.Organization.Email ?? string.Empty,
            Plan = subscription.Plan,
            Status = subscription.Status,
            StartDate = subscription.StartDate,
            EndDate = subscription.EndDate,
            BillingCycle = subscription.BillingCycle,
            Amount = subscription.Amount,
        });
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