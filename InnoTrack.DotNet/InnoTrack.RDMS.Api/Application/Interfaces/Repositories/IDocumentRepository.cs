using InnoTrack.RDMS.Api.Domain.Entities;

namespace InnoTrack.RDMS.Api.Application.Interfaces.Repositories;

public interface IDocumentRepository
{
    Task<List<Document>> GetDocumentsAsync(
        Guid? organizationId,
        Guid? projectId,
        int? categoryId,
        string? search,
        IReadOnlyCollection<string>? tags,
        bool includeArchived,
        CancellationToken cancellationToken = default);

    Task<Document?> GetByIdAsync(Guid id, bool includeAccessLogs = false, bool includeDeleted = false, CancellationToken cancellationToken = default);
    Task<DocumentVersion?> GetVersionAsync(Guid documentId, int versionNumber, CancellationToken cancellationToken = default);
    Task<List<DocumentVersion>> GetVersionsAsync(Guid documentId, CancellationToken cancellationToken = default);
    Task<List<DocumentCategory>> GetCategoriesAsync(Guid? organizationId, CancellationToken cancellationToken = default);
    Task<DocumentCategory?> GetCategoryByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<DocumentCategory?> GetCategoryByNameAsync(Guid organizationId, string name, CancellationToken cancellationToken = default);
    Task AddCategoryAsync(DocumentCategory category, CancellationToken cancellationToken = default);
    Task<List<DocumentTag>> GetTagsAsync(Guid? organizationId, CancellationToken cancellationToken = default);
    Task<List<DocumentTag>> GetTagsByNamesAsync(Guid organizationId, IReadOnlyCollection<string> names, CancellationToken cancellationToken = default);
    Task<DocumentTag?> GetTagByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<DocumentTag?> GetTagByNameAsync(Guid organizationId, string name, CancellationToken cancellationToken = default);
    Task AddTagAsync(DocumentTag tag, CancellationToken cancellationToken = default);
    Task AddAsync(Document document, CancellationToken cancellationToken = default);
    void Update(Document document);
    void RemoveCategory(DocumentCategory category);
    void RemoveTag(DocumentTag tag);
    Task AddVersionAsync(DocumentVersion version, CancellationToken cancellationToken = default);
    Task AddAccessLogAsync(DocumentAccessLog accessLog, CancellationToken cancellationToken = default);
    Task ReplaceTagMappingsAsync(Guid documentId, IReadOnlyCollection<int> tagIds, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}