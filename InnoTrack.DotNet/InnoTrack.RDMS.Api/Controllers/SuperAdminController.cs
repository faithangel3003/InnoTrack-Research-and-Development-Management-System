using InnoTrack.RDMS.Api.Application.Interfaces.Services;
using InnoTrack.RDMS.Api.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InnoTrack.RDMS.Api.Controllers;

[ApiController]
[Route("api/superadmin")]
[Authorize(Roles = RoleNames.SuperAdmin)]
public class SuperAdminController(ISuperAdminPortalService portalService) : ControllerBase
{
    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard(CancellationToken cancellationToken)
    {
        var result = await portalService.GetDashboardAsync(cancellationToken);
        return Ok(result);
    }
}