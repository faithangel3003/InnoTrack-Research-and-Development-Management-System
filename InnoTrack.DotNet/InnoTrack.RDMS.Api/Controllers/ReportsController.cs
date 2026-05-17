using InnoTrack.RDMS.Api.Application.Dtos.SuperAdmin;
using InnoTrack.RDMS.Api.Application.Interfaces.Services;
using InnoTrack.RDMS.Api.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InnoTrack.RDMS.Api.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize(Roles = RoleNames.SuperAdmin)]
public class ReportsController(ISuperAdminPortalService portalService) : ControllerBase
{
    [HttpGet("preview")]
    public async Task<IActionResult> Preview([FromQuery] ReportPreviewQueryDto query, CancellationToken cancellationToken)
    {
        var result = await portalService.GetReportPreviewAsync(query, cancellationToken);
        return Ok(result);
    }

    [HttpGet("{type}")]
    public async Task<IActionResult> Download(string type, [FromQuery] ReportDownloadQueryDto query, CancellationToken cancellationToken)
    {
        var file = await portalService.DownloadReportAsync(type, query, cancellationToken);
        return File(file.Content, file.ContentType, file.FileName);
    }
}