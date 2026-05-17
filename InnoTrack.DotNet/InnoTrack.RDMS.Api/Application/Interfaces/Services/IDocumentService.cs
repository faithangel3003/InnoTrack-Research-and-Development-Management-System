using InnoTrack.RDMS.Api.Application.Dtos.Documents;

namespace InnoTrack.RDMS.Api.Application.Interfaces.Services;

public interface IDocumentService
{
    Task<List<DocumentDto>> GetDocumentsAsync(Guid actorUserId, string actorRole, Guid? projectId, int? categoryId, string? search, IReadOnlyCollection<string>? tags, bool includeArchived, CancellationToken cancellationToken = default);
    Task<DocumentDetailDto?> GetDocumentByIdAsync(Guid id, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default);
    Task<DocumentDetailDto> CreateDocumentAsync(CreateDocumentDto request, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default);
    Task<DocumentDetailDto?> UpdateDocumentAsync(Guid id, UpdateDocumentDto request, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default);
    Task<DocumentDetailDto?> AddVersionAsync(Guid id, AddDocumentVersionDto request, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default);
    Task<List<DocumentVersionDto>> GetDocumentVersionsAsync(Guid id, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default);
    Task<DocumentDetailDto?> ArchiveDocumentAsync(Guid id, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default);
    Task<bool> DeleteDocumentAsync(Guid id, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default);
    Task<DocumentDownloadResult?> DownloadDocumentAsync(Guid id, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default);
    Task<DocumentDownloadResult?> DownloadDocumentVersionAsync(Guid id, int versionNumber, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default);
    Task<List<DocumentCategoryDto>> GetCategoriesAsync(Guid actorUserId, string actorRole, CancellationToken cancellationToken = default);
    Task<DocumentCategoryDto> CreateCategoryAsync(CreateDocumentCategoryDto request, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default);
    Task<DocumentCategoryDto?> UpdateCategoryAsync(int id, CreateDocumentCategoryDto request, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default);
    Task<bool> DeleteCategoryAsync(int id, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default);
    Task<List<DocumentTagDto>> GetTagsAsync(Guid actorUserId, string actorRole, CancellationToken cancellationToken = default);
    Task<DocumentTagDto> CreateTagAsync(CreateDocumentTagDto request, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default);
    Task<bool> DeleteTagAsync(int id, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default);
    Task<List<DocumentAccessLogDto>> GetAccessLogsAsync(Guid documentId, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default);
}