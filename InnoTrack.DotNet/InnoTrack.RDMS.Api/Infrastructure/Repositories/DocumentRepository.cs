using InnoTrack.RDMS.Api.Application.Interfaces.Repositories;
using InnoTrack.RDMS.Api.Domain.Entities;
using InnoTrack.RDMS.Api.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace InnoTrack.RDMS.Api.Infrastructure.Repositories;

public class DocumentRepository(AppDbContext dbContext) : IDocumentRepository
{
    public Task<List<Document>> GetDocumentsAsync(
        Guid? organizationId,
        Guid? projectId,
        int? categoryId,
        string? search,
        IReadOnlyCollection<string>? tags,
        bool includeArchived,
        CancellationToken cancellationToken = default)
    {
        var query = dbContext.Documents
            .Include(x => x.Category)
            .Include(x => x.Project)
            .Include(x => x.UploadedByUser)
            .Include(x => x.TagMappings)
                .ThenInclude(x => x.Tag)
            .AsQueryable();

        query = query.Where(x => x.DeletedAt == null);

        if (organizationId.HasValue)
        {
            query = query.Where(x => x.OrganizationId == organizationId.Value);
        }

        if (projectId.HasValue)
        {
            query = query.Where(x => x.ProjectId == projectId.Value);
        }

        if (categoryId.HasValue)
        {
            query = query.Where(x => x.CategoryId == categoryId.Value);
        }

        if (!includeArchived)
        {
            query = query.Where(x => !x.IsArchived);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var trimmed = search.Trim();
            query = query.Where(x =>
                x.Title.Contains(trimmed) ||
                (x.Description != null && x.Description.Contains(trimmed)) ||
                (x.References != null && x.References.Contains(trimmed)) ||
                x.OriginalFileName.Contains(trimmed));
        }

        if (tags is { Count: > 0 })
        {
            var normalizedTags = tags
                .Select(tag => tag.Trim().ToLower())
                .Where(tag => !string.IsNullOrWhiteSpace(tag))
                .Distinct()
                .ToList();

            if (normalizedTags.Count > 0)
            {
                query = query.Where(x => x.TagMappings.Any(mapping => normalizedTags.Contains(mapping.Tag.Name.ToLower())));
            }
        }

        return query
            .OrderByDescending(x => x.UpdatedAt)
            .ToListAsync(cancellationToken);
    }

    public Task<Document?> GetByIdAsync(Guid id, bool includeAccessLogs = false, bool includeDeleted = false, CancellationToken cancellationToken = default)
    {
        IQueryable<Document> query = dbContext.Documents
            .Include(x => x.Category)
            .Include(x => x.Project)
            .Include(x => x.UploadedByUser)
            .Include(x => x.TagMappings)
                .ThenInclude(x => x.Tag)
            .Include(x => x.Versions);

        if (includeAccessLogs)
        {
            query = query
                .Include(x => x.AccessLogs)
                    .ThenInclude(x => x.User);
        }

        if (!includeDeleted)
        {
            query = query.Where(x => x.DeletedAt == null);
        }

        return query.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public Task<DocumentVersion?> GetVersionAsync(Guid documentId, int versionNumber, CancellationToken cancellationToken = default)
    {
        return dbContext.DocumentVersions
            .FirstOrDefaultAsync(x => x.DocumentId == documentId && x.VersionNumber == versionNumber, cancellationToken);
    }

    public Task<List<DocumentVersion>> GetVersionsAsync(Guid documentId, CancellationToken cancellationToken = default)
    {
        return dbContext.DocumentVersions
            .Where(x => x.DocumentId == documentId)
            .OrderByDescending(x => x.VersionNumber)
            .ToListAsync(cancellationToken);
    }

    public Task<List<DocumentCategory>> GetCategoriesAsync(Guid? organizationId, CancellationToken cancellationToken = default)
    {
        var query = dbContext.DocumentCategories.AsQueryable();

        if (organizationId.HasValue)
        {
            query = query.Where(x => x.OrganizationId == organizationId.Value);
        }

        return query.OrderBy(x => x.Name).ToListAsync(cancellationToken);
    }

    public Task<DocumentCategory?> GetCategoryByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return dbContext.DocumentCategories.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public Task<DocumentCategory?> GetCategoryByNameAsync(Guid organizationId, string name, CancellationToken cancellationToken = default)
    {
        var normalized = name.Trim().ToLower();
        return dbContext.DocumentCategories.FirstOrDefaultAsync(
            x => x.OrganizationId == organizationId && x.Name.ToLower() == normalized,
            cancellationToken);
    }

    public Task AddCategoryAsync(DocumentCategory category, CancellationToken cancellationToken = default)
    {
        return dbContext.DocumentCategories.AddAsync(category, cancellationToken).AsTask();
    }

    public Task<List<DocumentTag>> GetTagsAsync(Guid? organizationId, CancellationToken cancellationToken = default)
    {
        var query = dbContext.DocumentTags.AsQueryable();

        if (organizationId.HasValue)
        {
            query = query.Where(x => x.OrganizationId == organizationId.Value);
        }

        return query.OrderBy(x => x.Name).ToListAsync(cancellationToken);
    }

    public Task<List<DocumentTag>> GetTagsByNamesAsync(Guid organizationId, IReadOnlyCollection<string> names, CancellationToken cancellationToken = default)
    {
        var normalizedNames = names
            .Select(x => x.Trim().ToLower())
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Distinct()
            .ToList();

        if (normalizedNames.Count == 0)
        {
            return Task.FromResult(new List<DocumentTag>());
        }

        return dbContext.DocumentTags
            .Where(x => x.OrganizationId == organizationId && normalizedNames.Contains(x.Name.ToLower()))
            .ToListAsync(cancellationToken);
    }

    public Task<DocumentTag?> GetTagByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return dbContext.DocumentTags.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public Task<DocumentTag?> GetTagByNameAsync(Guid organizationId, string name, CancellationToken cancellationToken = default)
    {
        var normalized = name.Trim().ToLower();
        return dbContext.DocumentTags.FirstOrDefaultAsync(
            x => x.OrganizationId == organizationId && x.Name.ToLower() == normalized,
            cancellationToken);
    }

    public Task AddTagAsync(DocumentTag tag, CancellationToken cancellationToken = default)
    {
        return dbContext.DocumentTags.AddAsync(tag, cancellationToken).AsTask();
    }

    public Task AddAsync(Document document, CancellationToken cancellationToken = default)
    {
        return dbContext.Documents.AddAsync(document, cancellationToken).AsTask();
    }

    public void Update(Document document)
    {
        dbContext.Documents.Update(document);
    }

    public void RemoveCategory(DocumentCategory category)
    {
        dbContext.DocumentCategories.Remove(category);
    }

    public void RemoveTag(DocumentTag tag)
    {
        dbContext.DocumentTags.Remove(tag);
    }

    public Task AddVersionAsync(DocumentVersion version, CancellationToken cancellationToken = default)
    {
        return dbContext.DocumentVersions.AddAsync(version, cancellationToken).AsTask();
    }

    public Task AddAccessLogAsync(DocumentAccessLog accessLog, CancellationToken cancellationToken = default)
    {
        return dbContext.DocumentAccessLogs.AddAsync(accessLog, cancellationToken).AsTask();
    }

    public async Task ReplaceTagMappingsAsync(Guid documentId, IReadOnlyCollection<int> tagIds, CancellationToken cancellationToken = default)
    {
        var existing = await dbContext.DocumentTagMap
            .Where(x => x.DocumentId == documentId)
            .ToListAsync(cancellationToken);

        if (existing.Count > 0)
        {
            dbContext.DocumentTagMap.RemoveRange(existing);
        }

        var distinctTagIds = tagIds.Distinct().ToList();
        if (distinctTagIds.Count == 0)
        {
            return;
        }

        var mappings = distinctTagIds.Select(tagId => new DocumentTagMap
        {
            DocumentId = documentId,
            TagId = tagId
        });

        await dbContext.DocumentTagMap.AddRangeAsync(mappings, cancellationToken);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return dbContext.SaveChangesAsync(cancellationToken);
    }
}