using System.Security.Claims;
using InnoTrack.RDMS.Api.Application.Dtos.Documents;
using InnoTrack.RDMS.Api.Application.Interfaces.Services;
using InnoTrack.RDMS.Api.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace InnoTrack.RDMS.Api.Controllers;

[ApiController]
[Route("api/documents")]
[Authorize]
public class DocumentsController(IDocumentService documentService) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager + "," + RoleNames.TeamMember)]
    public async Task<IActionResult> GetDocuments([FromQuery] Guid? projectId, [FromQuery] int? categoryId, [FromQuery] string? search, [FromQuery] List<string>? tags, [FromQuery] bool includeArchived, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        var data = await documentService.GetDocumentsAsync(actorId, role, projectId, categoryId, search, tags, includeArchived, cancellationToken);
        return Ok(data);
    }

    [HttpGet("search")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager + "," + RoleNames.TeamMember)]
    public async Task<IActionResult> SearchDocuments([FromQuery(Name = "q")] string? query, [FromQuery] Guid? projectId, [FromQuery] int? categoryId, [FromQuery] List<string>? tags, [FromQuery] bool includeArchived, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        var data = await documentService.GetDocumentsAsync(actorId, role, projectId, categoryId, query, tags, includeArchived, cancellationToken);
        return Ok(data);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager + "," + RoleNames.TeamMember)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        var data = await documentService.GetDocumentByIdAsync(id, actorId, role, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        return data is null ? NotFound() : Ok(data);
    }

    [HttpGet("{id:guid}/versions")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager + "," + RoleNames.TeamMember)]
    public async Task<IActionResult> GetVersions(Guid id, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        return Ok(await documentService.GetDocumentVersionsAsync(id, actorId, role, cancellationToken));
    }

    [HttpGet("/api/projects/{id:guid}/documents")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager + "," + RoleNames.TeamMember)]
    public async Task<IActionResult> GetProjectDocuments(Guid id, [FromQuery] int? categoryId, [FromQuery] string? search, [FromQuery] List<string>? tags, [FromQuery] bool includeArchived, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        return Ok(await documentService.GetDocumentsAsync(actorId, role, id, categoryId, search, tags, includeArchived, cancellationToken));
    }

    [HttpPost("upload")]
    [Authorize(Roles = RoleNames.SystemAdmin + "," + RoleNames.ProjectManager + "," + RoleNames.TeamMember)]
    [EnableRateLimiting("UploadPolicy")]
    [RequestFormLimits(MultipartBodyLengthLimit = 52428800)]
    [RequestSizeLimit(52428800)]
    public async Task<IActionResult> Upload([FromForm] CreateDocumentDto request, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        var data = await documentService.CreateDocumentAsync(request, actorId, role, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = data.Id }, data);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = RoleNames.SystemAdmin + "," + RoleNames.ProjectManager + "," + RoleNames.TeamMember)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateDocumentDto request, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        var data = await documentService.UpdateDocumentAsync(id, request, actorId, role, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        return data is null ? NotFound() : Ok(data);
    }

    [HttpPost("{id:guid}/versions")]
    [Authorize(Roles = RoleNames.SystemAdmin + "," + RoleNames.ProjectManager + "," + RoleNames.TeamMember)]
    [RequestFormLimits(MultipartBodyLengthLimit = 52428800)]
    [RequestSizeLimit(52428800)]
    public async Task<IActionResult> AddVersion(Guid id, [FromForm] AddDocumentVersionDto request, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        var data = await documentService.AddVersionAsync(id, request, actorId, role, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        return data is null ? NotFound() : Ok(data);
    }

    [HttpPatch("{id:guid}/archive")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager)]
    public async Task<IActionResult> Archive(Guid id, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        var data = await documentService.ArchiveDocumentAsync(id, actorId, role, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        return data is null ? NotFound() : Ok(data);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager + "," + RoleNames.TeamMember)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        var deleted = await documentService.DeleteDocumentAsync(id, actorId, role, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        return deleted ? NoContent() : NotFound();
    }

    [HttpGet("{id:guid}/download")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager + "," + RoleNames.TeamMember)]
    public async Task<IActionResult> Download(Guid id, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        var data = await documentService.DownloadDocumentAsync(id, actorId, role, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        return data is null ? NotFound() : File(data.Content, data.ContentType, data.FileName);
    }

    [HttpGet("{id:guid}/versions/{versionNumber:int}/download")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager + "," + RoleNames.TeamMember)]
    public async Task<IActionResult> DownloadVersion(Guid id, int versionNumber, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        var data = await documentService.DownloadDocumentVersionAsync(id, versionNumber, actorId, role, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        return data is null ? NotFound() : File(data.Content, data.ContentType, data.FileName);
    }

    [HttpGet("categories")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager + "," + RoleNames.TeamMember)]
    public async Task<IActionResult> GetCategories(CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        var data = await documentService.GetCategoriesAsync(actorId, role, cancellationToken);
        return Ok(data);
    }

    [HttpPost("categories")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager)]
    public async Task<IActionResult> CreateCategory([FromBody] CreateDocumentCategoryDto request, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        var data = await documentService.CreateCategoryAsync(request, actorId, role, cancellationToken);
        return Ok(data);
    }

    [HttpPut("categories/{id:int}")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager)]
    public async Task<IActionResult> UpdateCategory(int id, [FromBody] CreateDocumentCategoryDto request, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        var data = await documentService.UpdateCategoryAsync(id, request, actorId, role, cancellationToken);
        return data is null ? NotFound() : Ok(data);
    }

    [HttpDelete("categories/{id:int}")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin)]
    public async Task<IActionResult> DeleteCategory(int id, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        var deleted = await documentService.DeleteCategoryAsync(id, actorId, role, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }

    [HttpGet("tags")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager + "," + RoleNames.TeamMember)]
    public async Task<IActionResult> GetTags(CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        var data = await documentService.GetTagsAsync(actorId, role, cancellationToken);
        return Ok(data);
    }

    [HttpPost("tags")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager)]
    public async Task<IActionResult> CreateTag([FromBody] CreateDocumentTagDto request, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        var data = await documentService.CreateTagAsync(request, actorId, role, cancellationToken);
        return Ok(data);
    }

    [HttpDelete("tags/{id:int}")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin)]
    public async Task<IActionResult> DeleteTag(int id, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        var deleted = await documentService.DeleteTagAsync(id, actorId, role, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }

    [HttpGet("{id:guid}/access-logs")]
    [Authorize(Roles = RoleNames.SuperAdmin + "," + RoleNames.SystemAdmin + "," + RoleNames.ProjectManager)]
    public async Task<IActionResult> GetAccessLogs(Guid id, CancellationToken cancellationToken)
    {
        var (actorId, role) = GetActorContext();
        var data = await documentService.GetAccessLogsAsync(id, actorId, role, cancellationToken);
        return Ok(data);
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