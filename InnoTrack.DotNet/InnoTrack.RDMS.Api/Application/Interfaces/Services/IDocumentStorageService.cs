using InnoTrack.RDMS.Api.Application.Dtos.Documents;
using Microsoft.AspNetCore.Http;

namespace InnoTrack.RDMS.Api.Application.Interfaces.Services;

public interface IDocumentStorageService
{
    Task<StoredDocumentFileResult> SaveFileAsync(IFormFile file, Guid organizationId, Guid documentId, int versionNumber, CancellationToken cancellationToken = default);
    Task<Stream> OpenReadAsync(string relativePath, CancellationToken cancellationToken = default);
    Task DeleteFileAsync(string relativePath, CancellationToken cancellationToken = default);
    string ResolveContentType(string fileNameOrExtension);
}