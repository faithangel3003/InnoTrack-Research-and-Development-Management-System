using InnoTrack.RDMS.Api.Application.Dtos.SuperAdmin;
using InnoTrack.RDMS.Api.Application.Interfaces.Services;
using InnoTrack.RDMS.Api.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InnoTrack.RDMS.Api.Controllers;

[ApiController]
[Route("api/payments")]
[Authorize(Roles = RoleNames.SuperAdmin)]
public class PaymentsController(ISuperAdminPortalService portalService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] PaymentQueryDto query, CancellationToken cancellationToken)
    {
        var result = await portalService.GetPaymentsAsync(query, cancellationToken);
        return Ok(result);
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary(CancellationToken cancellationToken)
    {
        var result = await portalService.GetPaymentSummaryAsync(cancellationToken);
        return Ok(result);
    }
}