using InnoTrack.RDMS.Api.Application.Dtos.Documents;
using InnoTrack.RDMS.Api.Application.Interfaces.Repositories;
using InnoTrack.RDMS.Api.Application.Interfaces.Services;
using InnoTrack.RDMS.Api.Domain.Entities;
using InnoTrack.RDMS.Api.Domain.Enums;
using InnoTrack.RDMS.Api.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace InnoTrack.RDMS.Api.Application.Services;

public partial class DocumentService(
    IDocumentRepository documentRepository,
    IAuditLogService auditLogService,
    IDocumentStorageService documentStorageService,
    INotificationService notificationService,
    ILogger<DocumentService> logger,
    AppDbContext dbContext) : IDocumentService
{
    public async Task<List<DocumentDto>> GetDocumentsAsync(Guid actorUserId, string actorRole, Guid? projectId, int? categoryId, string? search, IReadOnlyCollection<string>? tags, bool includeArchived, CancellationToken cancellationToken = default)
    {
        var normalizedRole = NormalizeRole(actorRole);
        var actorOrganizationId = await GetActorOrganizationIdAsync(actorUserId, cancellationToken);
        var organizationScope = normalizedRole == "superadmin" ? null : actorOrganizationId;

        if (normalizedRole != "superadmin" && !organizationScope.HasValue)
        {
            throw new UnauthorizedAccessException("User must belong to an organization to access documents");
        }

        var documents = await documentRepository.GetDocumentsAsync(organizationScope, projectId, categoryId, search, tags, includeArchived, cancellationToken);
        documents = await FilterDocumentsForActorAsync(documents, actorUserId, actorRole, cancellationToken);
        return documents.Select(MapDocument).ToList();
    }

    public async Task<DocumentDetailDto?> GetDocumentByIdAsync(Guid id, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var document = await documentRepository.GetByIdAsync(id, false, false, cancellationToken);
        if (document is null)
        {
            return null;
        }

        await EnsureCanAccessDocumentAsync(document, actorUserId, actorRole, cancellationToken);

        await LogDocumentAccessAsync(document.Id, actorUserId, DocumentAccessAction.Viewed, ipAddress, cancellationToken);

        var includeAccessLogs = CanManageDocuments(actorRole);
        var hydratedDocument = await documentRepository.GetByIdAsync(id, includeAccessLogs, false, cancellationToken)
            ?? throw new InvalidOperationException("Document could not be reloaded");

        return MapDocumentDetail(hydratedDocument, includeAccessLogs);
    }

    public async Task<DocumentDetailDto> CreateDocumentAsync(CreateDocumentDto request, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var organizationId = await ResolveOrganizationIdAsync(actorUserId, actorRole, request.OrganizationId, cancellationToken);
        await EnsureCanCreateDocumentAsync(actorUserId, actorRole, request.ProjectId, organizationId, cancellationToken);
        await ValidateProjectAsync(request.ProjectId, organizationId, cancellationToken);
        await ValidateCategoryAsync(request.CategoryId, organizationId, cancellationToken);

        var documentId = Guid.NewGuid();
        var storedFile = await documentStorageService.SaveFileAsync(request.File, organizationId, documentId, 1, cancellationToken);

        var document = new Document
        {
            Id = documentId,
            Title = request.Title.Trim(),
            Description = request.Description?.Trim(),
            References = request.References?.Trim(),
            FileName = storedFile.StoredFileName,
            OriginalFileName = storedFile.OriginalFileName,
            FilePath = storedFile.RelativePath,
            FileSize = storedFile.Size,
            FileType = storedFile.ContentType,
            FileExtension = storedFile.Extension,
            ProjectId = request.ProjectId,
            CategoryId = request.CategoryId,
            UploadedByUserId = actorUserId,
            OrganizationId = organizationId,
            Version = 1,
            IsArchived = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        try
        {
            await documentRepository.AddAsync(document, cancellationToken);
            await documentRepository.AddVersionAsync(new DocumentVersion
            {
                Id = Guid.NewGuid(),
                DocumentId = document.Id,
                VersionNumber = 1,
                FileName = storedFile.OriginalFileName,
                FilePath = storedFile.RelativePath,
                FileSize = storedFile.Size,
                UploadedByUserId = actorUserId,
                ChangeNotes = "Initial upload",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            }, cancellationToken);

            var tagIds = await EnsureTagsAsync(organizationId, request.Tags, cancellationToken);
            await documentRepository.ReplaceTagMappingsAsync(document.Id, tagIds, cancellationToken);

            await documentRepository.AddAccessLogAsync(new DocumentAccessLog
            {
                Id = Guid.NewGuid(),
                DocumentId = document.Id,
                UserId = actorUserId,
                Action = DocumentAccessAction.Uploaded,
                AccessedAt = DateTime.UtcNow,
                IpAddress = ipAddress,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            }, cancellationToken);

            await documentRepository.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            await TryDeleteUploadedFileAsync(storedFile.RelativePath, document.Id, 1);
            throw;
        }

        await auditLogService.LogActionAsync(actorUserId, actorUserId, organizationId, "documents.create", "documents", document.Id, "info", ipAddress, cancellationToken);
        await NotifyDocumentActivityAsync(
            document,
            actorUserId,
            "Document uploaded",
            await BuildDocumentActivityMessageAsync(document, actorUserId, "uploaded", cancellationToken),
            cancellationToken);

        var created = await documentRepository.GetByIdAsync(document.Id, true, false, cancellationToken)
            ?? throw new InvalidOperationException("Created document could not be loaded");

        return MapDocumentDetail(created, true);
    }

    public async Task<DocumentDetailDto?> UpdateDocumentAsync(Guid id, UpdateDocumentDto request, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var document = await documentRepository.GetByIdAsync(id, false, false, cancellationToken);
        if (document is null)
        {
            return null;
        }

        await EnsureCanEditDocumentAsync(document, actorUserId, actorRole, cancellationToken);
        await ValidateProjectAsync(request.ProjectId, document.OrganizationId, cancellationToken);
        await ValidateCategoryAsync(request.CategoryId, document.OrganizationId, cancellationToken);

        var previousArchivedState = document.IsArchived;

        document.Title = request.Title.Trim();
        document.Description = request.Description?.Trim();
        document.References = request.References?.Trim();
        document.ProjectId = request.ProjectId;
        document.CategoryId = request.CategoryId;
        document.IsArchived = request.IsArchived;
        document.UpdatedAt = DateTime.UtcNow;

        documentRepository.Update(document);

        var tagIds = await EnsureTagsAsync(document.OrganizationId, request.Tags, cancellationToken);
        await documentRepository.ReplaceTagMappingsAsync(document.Id, tagIds, cancellationToken);

        await documentRepository.AddAccessLogAsync(new DocumentAccessLog
        {
            Id = Guid.NewGuid(),
            DocumentId = document.Id,
            UserId = actorUserId,
            Action = request.IsArchived && !previousArchivedState ? DocumentAccessAction.Archived : DocumentAccessAction.Updated,
            AccessedAt = DateTime.UtcNow,
            IpAddress = ipAddress,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        }, cancellationToken);

        await documentRepository.SaveChangesAsync(cancellationToken);

        var actionName = request.IsArchived && !previousArchivedState ? "documents.archive" : "documents.update";
        await auditLogService.LogActionAsync(actorUserId, actorUserId, document.OrganizationId, actionName, "documents", document.Id, "info", ipAddress, cancellationToken);
        await NotifyDocumentActivityAsync(
            document,
            actorUserId,
            request.IsArchived && !previousArchivedState ? "Document archived" : "Document updated",
            await BuildDocumentActivityMessageAsync(document, actorUserId, request.IsArchived && !previousArchivedState ? "archived" : "updated", cancellationToken),
            cancellationToken);

        var updated = await documentRepository.GetByIdAsync(document.Id, true, false, cancellationToken)
            ?? throw new InvalidOperationException("Updated document could not be loaded");

        return MapDocumentDetail(updated, true);
    }

    public async Task<DocumentDetailDto?> AddVersionAsync(Guid id, AddDocumentVersionDto request, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var document = await documentRepository.GetByIdAsync(id, false, false, cancellationToken);
        if (document is null)
        {
            return null;
        }

        await EnsureCanEditDocumentAsync(document, actorUserId, actorRole, cancellationToken);

        var nextVersion = document.Version + 1;
        var storedFile = await documentStorageService.SaveFileAsync(request.File, document.OrganizationId, document.Id, nextVersion, cancellationToken);

        try
        {
            document.Version = nextVersion;
            document.FileName = storedFile.StoredFileName;
            document.OriginalFileName = storedFile.OriginalFileName;
            document.FilePath = storedFile.RelativePath;
            document.FileSize = storedFile.Size;
            document.FileType = storedFile.ContentType;
            document.FileExtension = storedFile.Extension;
            document.UpdatedAt = DateTime.UtcNow;

            documentRepository.Update(document);
            await documentRepository.AddVersionAsync(new DocumentVersion
            {
                Id = Guid.NewGuid(),
                DocumentId = document.Id,
                VersionNumber = nextVersion,
                FileName = storedFile.OriginalFileName,
                FilePath = storedFile.RelativePath,
                FileSize = storedFile.Size,
                UploadedByUserId = actorUserId,
                ChangeNotes = request.ChangeNotes?.Trim(),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            }, cancellationToken);

            await documentRepository.AddAccessLogAsync(new DocumentAccessLog
            {
                Id = Guid.NewGuid(),
                DocumentId = document.Id,
                UserId = actorUserId,
                Action = DocumentAccessAction.Updated,
                AccessedAt = DateTime.UtcNow,
                IpAddress = ipAddress,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            }, cancellationToken);

            await documentRepository.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            await TryDeleteUploadedFileAsync(storedFile.RelativePath, document.Id, nextVersion);
            throw;
        }

        await auditLogService.LogActionAsync(actorUserId, actorUserId, document.OrganizationId, "documents.version.add", "documents", document.Id, "info", ipAddress, cancellationToken);
        await NotifyDocumentActivityAsync(
            document,
            actorUserId,
            "Document version uploaded",
            await BuildDocumentActivityMessageAsync(document, actorUserId, $"uploaded version {nextVersion} for", cancellationToken),
            cancellationToken);

        var updated = await documentRepository.GetByIdAsync(document.Id, true, false, cancellationToken)
            ?? throw new InvalidOperationException("Versioned document could not be loaded");

        return MapDocumentDetail(updated, true);
    }

    private async Task TryDeleteUploadedFileAsync(string? relativePath, Guid documentId, int versionNumber)
    {
        if (string.IsNullOrWhiteSpace(relativePath))
        {
            return;
        }

        try
        {
            await documentStorageService.DeleteFileAsync(relativePath, CancellationToken.None);
        }
        catch
        {
            logger.LogWarning(
                "Failed to clean up uploaded document file {RelativePath} for document {DocumentId} version {VersionNumber} after a persistence failure.",
                relativePath,
                documentId,
                versionNumber);
        }
    }

    public async Task<List<DocumentVersionDto>> GetDocumentVersionsAsync(Guid id, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default)
    {
        var document = await documentRepository.GetByIdAsync(id, false, false, cancellationToken);
        if (document is null)
        {
            return new List<DocumentVersionDto>();
        }

        await EnsureCanAccessDocumentAsync(document, actorUserId, actorRole, cancellationToken);

        var versions = await documentRepository.GetVersionsAsync(id, cancellationToken);
        return versions
            .OrderByDescending(x => x.VersionNumber)
            .Select(x => new DocumentVersionDto
            {
                Id = x.Id,
                VersionNumber = x.VersionNumber,
                FileName = x.FileName,
                FileSize = x.FileSize,
                ChangeNotes = x.ChangeNotes,
                UploadedByUserId = x.UploadedByUserId,
                CreatedAt = x.CreatedAt,
            })
            .ToList();
    }

    public async Task<DocumentDetailDto?> ArchiveDocumentAsync(Guid id, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var document = await documentRepository.GetByIdAsync(id, false, false, cancellationToken);
        if (document is null)
        {
            return null;
        }

        await EnsureCanArchiveDocumentAsync(document, actorUserId, actorRole, cancellationToken);

        if (!document.IsArchived)
        {
            document.IsArchived = true;
            document.UpdatedAt = DateTime.UtcNow;
            documentRepository.Update(document);

            await documentRepository.AddAccessLogAsync(new DocumentAccessLog
            {
                Id = Guid.NewGuid(),
                DocumentId = document.Id,
                UserId = actorUserId,
                Action = DocumentAccessAction.Archived,
                AccessedAt = DateTime.UtcNow,
                IpAddress = ipAddress,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            }, cancellationToken);

            await documentRepository.SaveChangesAsync(cancellationToken);
            await auditLogService.LogActionAsync(actorUserId, actorUserId, document.OrganizationId, "documents.archive", "documents", document.Id, "info", ipAddress, cancellationToken);
            await NotifyDocumentActivityAsync(
                document,
                actorUserId,
                "Document archived",
                await BuildDocumentActivityMessageAsync(document, actorUserId, "archived", cancellationToken),
                cancellationToken);
        }

        var archived = await documentRepository.GetByIdAsync(document.Id, true, false, cancellationToken)
            ?? throw new InvalidOperationException("Archived document could not be loaded");

        return MapDocumentDetail(archived, true);
    }

    public async Task<bool> DeleteDocumentAsync(Guid id, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var document = await documentRepository.GetByIdAsync(id, false, false, cancellationToken);
        if (document is null)
        {
            return false;
        }

        await EnsureCanDeleteDocumentAsync(document, actorUserId, actorRole, cancellationToken);

        var filePathsToDelete = document.Versions
            .Select(version => version.FilePath)
            .Append(document.FilePath)
            .Where(path => !string.IsNullOrWhiteSpace(path))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        foreach (var filePath in filePathsToDelete)
        {
            await documentStorageService.DeleteFileAsync(filePath, cancellationToken);
        }

        document.IsArchived = true;
        document.DeletedAt = DateTime.UtcNow;
        document.UpdatedAt = DateTime.UtcNow;
        documentRepository.Update(document);

        await documentRepository.AddAccessLogAsync(new DocumentAccessLog
        {
            Id = Guid.NewGuid(),
            DocumentId = document.Id,
            UserId = actorUserId,
            Action = DocumentAccessAction.Deleted,
            AccessedAt = DateTime.UtcNow,
            IpAddress = ipAddress,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        }, cancellationToken);

        await documentRepository.SaveChangesAsync(cancellationToken);
        await auditLogService.LogActionAsync(actorUserId, actorUserId, document.OrganizationId, "documents.delete", "documents", document.Id, "warning", ipAddress, cancellationToken);
        await NotifyDocumentActivityAsync(
            document,
            actorUserId,
            "Document deleted",
            await BuildDocumentActivityMessageAsync(document, actorUserId, "deleted", cancellationToken),
            cancellationToken);

        return true;
    }

    public async Task<DocumentDownloadResult?> DownloadDocumentAsync(Guid id, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var document = await documentRepository.GetByIdAsync(id, false, false, cancellationToken);
        if (document is null)
        {
            return null;
        }

        await EnsureCanAccessDocumentAsync(document, actorUserId, actorRole, cancellationToken);
        await LogDocumentAccessAsync(document.Id, actorUserId, DocumentAccessAction.Downloaded, ipAddress, cancellationToken);

        var stream = await documentStorageService.OpenReadAsync(document.FilePath, cancellationToken);
        return new DocumentDownloadResult
        {
            Content = stream,
            ContentType = document.FileType,
            FileName = document.OriginalFileName,
        };
    }

    public async Task<DocumentDownloadResult?> DownloadDocumentVersionAsync(Guid id, int versionNumber, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var document = await documentRepository.GetByIdAsync(id, false, false, cancellationToken);
        if (document is null)
        {
            return null;
        }

        await EnsureCanAccessDocumentAsync(document, actorUserId, actorRole, cancellationToken);

        var version = await documentRepository.GetVersionAsync(id, versionNumber, cancellationToken);
        if (version is null)
        {
            return null;
        }

        await LogDocumentAccessAsync(document.Id, actorUserId, DocumentAccessAction.Downloaded, ipAddress, cancellationToken);

        var stream = await documentStorageService.OpenReadAsync(version.FilePath, cancellationToken);
        return new DocumentDownloadResult
        {
            Content = stream,
            ContentType = documentStorageService.ResolveContentType(version.FileName),
            FileName = version.FileName,
        };
    }

    public async Task<List<DocumentCategoryDto>> GetCategoriesAsync(Guid actorUserId, string actorRole, CancellationToken cancellationToken = default)
    {
        var organizationScope = await ResolveListOrganizationScopeAsync(actorUserId, actorRole, cancellationToken);
        var categories = await documentRepository.GetCategoriesAsync(organizationScope, cancellationToken);
        return categories.Select(x => new DocumentCategoryDto
        {
            Id = x.Id,
            Name = x.Name,
            Description = x.Description,
            CreatedAt = x.CreatedAt,
        }).ToList();
    }

    public async Task<DocumentCategoryDto> CreateCategoryAsync(CreateDocumentCategoryDto request, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default)
    {
        EnsureManagePermission(actorRole);

        var organizationId = await ResolveOrganizationIdAsync(actorUserId, actorRole, request.OrganizationId, cancellationToken);
        var existing = await documentRepository.GetCategoryByNameAsync(organizationId, request.Name, cancellationToken);
        if (existing is not null)
        {
            throw new InvalidOperationException("Document category already exists");
        }

        var category = new DocumentCategory
        {
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            OrganizationId = organizationId,
            CreatedAt = DateTime.UtcNow,
        };

        await documentRepository.AddCategoryAsync(category, cancellationToken);
        await documentRepository.SaveChangesAsync(cancellationToken);

        return new DocumentCategoryDto
        {
            Id = category.Id,
            Name = category.Name,
            Description = category.Description,
            CreatedAt = category.CreatedAt,
        };
    }

    public async Task<DocumentCategoryDto?> UpdateCategoryAsync(int id, CreateDocumentCategoryDto request, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default)
    {
        EnsureManagePermission(actorRole);

        var category = await documentRepository.GetCategoryByIdAsync(id, cancellationToken);
        if (category is null)
        {
            return null;
        }

        var actorOrganizationId = await ResolveOrganizationIdAsync(actorUserId, actorRole, request.OrganizationId ?? category.OrganizationId, cancellationToken);
        if (category.OrganizationId != actorOrganizationId)
        {
            throw new UnauthorizedAccessException("You are not allowed to modify this document category");
        }

        var existing = await documentRepository.GetCategoryByNameAsync(category.OrganizationId, request.Name, cancellationToken);
        if (existing is not null && existing.Id != category.Id)
        {
            throw new InvalidOperationException("Document category already exists");
        }

        category.Name = request.Name.Trim();
        category.Description = request.Description?.Trim();
        await documentRepository.SaveChangesAsync(cancellationToken);

        return new DocumentCategoryDto
        {
            Id = category.Id,
            Name = category.Name,
            Description = category.Description,
            CreatedAt = category.CreatedAt,
        };
    }

    public async Task<bool> DeleteCategoryAsync(int id, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default)
    {
        EnsureTaxonomyDeletePermission(actorRole);

        var category = await documentRepository.GetCategoryByIdAsync(id, cancellationToken);
        if (category is null)
        {
            return false;
        }

        var actorOrganizationId = await ResolveListOrganizationScopeAsync(actorUserId, actorRole, cancellationToken);
        if (actorOrganizationId.HasValue && category.OrganizationId != actorOrganizationId.Value)
        {
            throw new UnauthorizedAccessException("You are not allowed to delete this document category");
        }

        documentRepository.RemoveCategory(category);
        await documentRepository.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<List<DocumentTagDto>> GetTagsAsync(Guid actorUserId, string actorRole, CancellationToken cancellationToken = default)
    {
        var organizationScope = await ResolveListOrganizationScopeAsync(actorUserId, actorRole, cancellationToken);
        var tags = await documentRepository.GetTagsAsync(organizationScope, cancellationToken);
        return tags.Select(x => new DocumentTagDto
        {
            Id = x.Id,
            Name = x.Name,
        }).ToList();
    }

    public async Task<DocumentTagDto> CreateTagAsync(CreateDocumentTagDto request, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default)
    {
        EnsureManagePermission(actorRole);

        var organizationId = await ResolveOrganizationIdAsync(actorUserId, actorRole, request.OrganizationId, cancellationToken);
        var existing = await documentRepository.GetTagByNameAsync(organizationId, request.Name, cancellationToken);
        if (existing is not null)
        {
            throw new InvalidOperationException("Document tag already exists");
        }

        var tag = new DocumentTag
        {
            Name = request.Name.Trim(),
            OrganizationId = organizationId,
        };

        await documentRepository.AddTagAsync(tag, cancellationToken);
        await documentRepository.SaveChangesAsync(cancellationToken);

        return new DocumentTagDto
        {
            Id = tag.Id,
            Name = tag.Name,
        };
    }

    public async Task<bool> DeleteTagAsync(int id, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default)
    {
        EnsureTaxonomyDeletePermission(actorRole);

        var tag = await documentRepository.GetTagByIdAsync(id, cancellationToken);
        if (tag is null)
        {
            return false;
        }

        var actorOrganizationId = await ResolveListOrganizationScopeAsync(actorUserId, actorRole, cancellationToken);
        if (actorOrganizationId.HasValue && tag.OrganizationId != actorOrganizationId.Value)
        {
            throw new UnauthorizedAccessException("You are not allowed to delete this document tag");
        }

        documentRepository.RemoveTag(tag);
        await documentRepository.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<List<DocumentAccessLogDto>> GetAccessLogsAsync(Guid documentId, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default)
    {
        EnsureManagePermission(actorRole);

        var document = await documentRepository.GetByIdAsync(documentId, true, false, cancellationToken);
        if (document is null)
        {
            return new List<DocumentAccessLogDto>();
        }

        await EnsureCanAccessDocumentAsync(document, actorUserId, actorRole, cancellationToken);
        return document.AccessLogs
            .OrderByDescending(x => x.AccessedAt)
            .Select(MapAccessLog)
            .ToList();
    }

    private async Task<Guid?> ResolveListOrganizationScopeAsync(Guid actorUserId, string actorRole, CancellationToken cancellationToken)
    {
        return NormalizeRole(actorRole) == "superadmin"
            ? null
            : await GetActorOrganizationIdAsync(actorUserId, cancellationToken);
    }

    private static void EnsureTaxonomyDeletePermission(string actorRole)
    {
        var normalizedRole = NormalizeRole(actorRole);
        if (normalizedRole is not "superadmin" and not "systemadmin")
        {
            throw new UnauthorizedAccessException("Only administrators can delete document categories or tags");
        }
    }

    private async Task<Guid> ResolveOrganizationIdAsync(Guid actorUserId, string actorRole, Guid? requestedOrganizationId, CancellationToken cancellationToken)
    {
        if (NormalizeRole(actorRole) == "superadmin")
        {
            if (!requestedOrganizationId.HasValue)
            {
                throw new InvalidOperationException("OrganizationId is required for SuperAdmin document actions");
            }

            return requestedOrganizationId.Value;
        }

        return await GetActorOrganizationIdAsync(actorUserId, cancellationToken)
            ?? throw new UnauthorizedAccessException("User must belong to an organization to manage documents");
    }

    private async Task<Guid?> GetActorOrganizationIdAsync(Guid actorUserId, CancellationToken cancellationToken)
    {
        return await dbContext.Users
            .Where(x => x.Id == actorUserId)
            .Select(x => x.OrganizationId)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private async Task ValidateProjectAsync(Guid? projectId, Guid organizationId, CancellationToken cancellationToken)
    {
        if (!projectId.HasValue)
        {
            return;
        }

        var exists = await dbContext.Projects.AnyAsync(
            x => x.Id == projectId.Value && x.OrganizationId == organizationId,
            cancellationToken);

        if (!exists)
        {
            throw new InvalidOperationException("Selected project does not exist in the current organization");
        }
    }

    private async Task ValidateCategoryAsync(int? categoryId, Guid organizationId, CancellationToken cancellationToken)
    {
        if (!categoryId.HasValue)
        {
            return;
        }

        var category = await documentRepository.GetCategoryByIdAsync(categoryId.Value, cancellationToken);
        if (category is null || category.OrganizationId != organizationId)
        {
            throw new InvalidOperationException("Selected document category is invalid");
        }
    }

    private async Task<List<int>> EnsureTagsAsync(Guid organizationId, IReadOnlyCollection<string> names, CancellationToken cancellationToken)
    {
        var normalizedNames = names
            .Select(x => x.Trim())
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (normalizedNames.Count == 0)
        {
            return new List<int>();
        }

        var existingTags = await documentRepository.GetTagsByNamesAsync(organizationId, normalizedNames, cancellationToken);
        var existingLookup = existingTags.ToDictionary(x => x.Name, x => x, StringComparer.OrdinalIgnoreCase);

        foreach (var name in normalizedNames)
        {
            if (existingLookup.ContainsKey(name))
            {
                continue;
            }

            var tag = new DocumentTag
            {
                Name = name,
                OrganizationId = organizationId,
            };

            await documentRepository.AddTagAsync(tag, cancellationToken);
            existingLookup[name] = tag;
        }

        await documentRepository.SaveChangesAsync(cancellationToken);

        return existingLookup.Values
            .Select(x => x.Id)
            .Distinct()
            .ToList();
    }

    private async Task LogDocumentAccessAsync(Guid documentId, Guid actorUserId, DocumentAccessAction action, string? ipAddress, CancellationToken cancellationToken)
    {
        await documentRepository.AddAccessLogAsync(new DocumentAccessLog
        {
            Id = Guid.NewGuid(),
            DocumentId = documentId,
            UserId = actorUserId,
            Action = action,
            AccessedAt = DateTime.UtcNow,
            IpAddress = ipAddress,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        }, cancellationToken);

        await documentRepository.SaveChangesAsync(cancellationToken);
    }

    private async Task NotifyDocumentActivityAsync(Document document, Guid actorUserId, string title, string message, CancellationToken cancellationToken)
    {
        var recipientIds = await ResolveDocumentRecipientUserIdsAsync(document, actorUserId, cancellationToken);
        await notificationService.CreateNotificationsAsync(recipientIds, actorUserId, NotificationType.DocumentUploaded, title, message, document.Id, "document", cancellationToken);
    }

    private async Task<List<Guid>> ResolveDocumentRecipientUserIdsAsync(Document document, Guid actorUserId, CancellationToken cancellationToken)
    {
        if (document.ProjectId.HasValue)
        {
            var project = await dbContext.Projects
                .Include(candidate => candidate.Members)
                .FirstOrDefaultAsync(candidate => candidate.Id == document.ProjectId.Value, cancellationToken);

            if (project is not null)
            {
                return await CrossModuleNotificationHelper.GetProjectStakeholderUserIdsAsync(dbContext, project, actorUserId, cancellationToken);
            }
        }

        return await CrossModuleNotificationHelper.GetOrganizationAdminUserIdsAsync(dbContext, document.OrganizationId, actorUserId, cancellationToken);
    }

    private async Task<string> BuildDocumentActivityMessageAsync(Document document, Guid actorUserId, string action, CancellationToken cancellationToken)
    {
        var actorName = await CrossModuleNotificationHelper.ResolveUserDisplayNameAsync(dbContext, actorUserId, cancellationToken);

        if (document.ProjectId.HasValue)
        {
            var projectTitle = await dbContext.Projects
                .Where(project => project.Id == document.ProjectId.Value)
                .Select(project => project.Title)
                .FirstOrDefaultAsync(cancellationToken);

            if (!string.IsNullOrWhiteSpace(projectTitle))
            {
                return $"{actorName} {action} document \"{document.Title}\" in project \"{projectTitle}\".";
            }
        }

        return $"{actorName} {action} document \"{document.Title}\" in the research library.";
    }

    private static string NormalizeRole(string role)
    {
        return role.Replace(" ", string.Empty).Trim().ToLowerInvariant();
    }

    private static bool CanManageDocuments(string actorRole)
    {
        var normalizedRole = NormalizeRole(actorRole);
        return normalizedRole is "superadmin" or "systemadmin" or "projectmanager";
    }

    private static void EnsureManagePermission(string actorRole)
    {
        if (!CanManageDocuments(actorRole))
        {
            throw new UnauthorizedAccessException("You do not have permission to manage research documents");
        }
    }

    private static DocumentDto MapDocument(Document document)
    {
        return new DocumentDto
        {
            Id = document.Id,
            Title = document.Title,
            Description = document.Description,
            References = document.References,
            OriginalFileName = document.OriginalFileName,
            FileType = document.FileType,
            FileExtension = document.FileExtension,
            FileSize = document.FileSize,
            Version = document.Version,
            IsArchived = document.IsArchived,
            ProjectId = document.ProjectId,
            ProjectTitle = document.Project?.Title,
            CategoryId = document.CategoryId,
            CategoryName = document.Category?.Name,
            UploadedByUserId = document.UploadedByUserId,
            UploadedByName = ResolveUserName(document.UploadedByUser),
            OrganizationId = document.OrganizationId,
            Tags = document.TagMappings
                .Select(x => x.Tag.Name)
                .OrderBy(x => x)
                .ToList(),
            CreatedAt = document.CreatedAt,
            UpdatedAt = document.UpdatedAt,
        };
    }

    private static DocumentDetailDto MapDocumentDetail(Document document, bool includeAccessLogs)
    {
        var detail = new DocumentDetailDto
        {
            Id = document.Id,
            Title = document.Title,
            Description = document.Description,
            References = document.References,
            OriginalFileName = document.OriginalFileName,
            FileType = document.FileType,
            FileExtension = document.FileExtension,
            FileSize = document.FileSize,
            Version = document.Version,
            IsArchived = document.IsArchived,
            ProjectId = document.ProjectId,
            ProjectTitle = document.Project?.Title,
            CategoryId = document.CategoryId,
            CategoryName = document.Category?.Name,
            UploadedByUserId = document.UploadedByUserId,
            UploadedByName = ResolveUserName(document.UploadedByUser),
            OrganizationId = document.OrganizationId,
            Tags = document.TagMappings
                .Select(x => x.Tag.Name)
                .OrderBy(x => x)
                .ToList(),
            CreatedAt = document.CreatedAt,
            UpdatedAt = document.UpdatedAt,
            Versions = document.Versions
                .OrderByDescending(x => x.VersionNumber)
                .Select(x => new DocumentVersionDto
                {
                    Id = x.Id,
                    VersionNumber = x.VersionNumber,
                    FileName = x.FileName,
                    FileSize = x.FileSize,
                    ChangeNotes = x.ChangeNotes,
                    UploadedByUserId = x.UploadedByUserId,
                    CreatedAt = x.CreatedAt,
                })
                .ToList(),
            AccessLogs = includeAccessLogs
                ? document.AccessLogs
                    .OrderByDescending(x => x.AccessedAt)
                    .Select(MapAccessLog)
                    .ToList()
                : new List<DocumentAccessLogDto>()
        };

        return detail;
    }

    private static DocumentAccessLogDto MapAccessLog(DocumentAccessLog accessLog)
    {
        return new DocumentAccessLogDto
        {
            Id = accessLog.Id,
            UserId = accessLog.UserId,
            UserName = ResolveUserName(accessLog.User),
            Action = accessLog.Action.ToString(),
            AccessedAt = accessLog.AccessedAt,
            IpAddress = accessLog.IpAddress,
        };
    }

    private static string ResolveUserName(AppUser user)
    {
        var fullName = $"{user.FirstName} {user.LastName}".Trim();
        return string.IsNullOrWhiteSpace(fullName) ? user.Email : fullName;
    }
}