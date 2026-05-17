using InnoTrack.RDMS.Api.Application.Dtos.Documents;
using InnoTrack.RDMS.Api.Application.Interfaces.Services;
using Microsoft.AspNetCore.Http;

namespace InnoTrack.RDMS.Api.Application.Services;

public class LocalDocumentStorageService(IWebHostEnvironment environment) : IDocumentStorageService
{
    private readonly string _storageRoot = Path.Combine(environment.ContentRootPath, "Storage", "documents");

    public async Task<StoredDocumentFileResult> SaveFileAsync(IFormFile file, Guid organizationId, Guid documentId, int versionNumber, CancellationToken cancellationToken = default)
    {
        var validation = DocumentStorageValidation.ValidateFile(file);
        var originalFileName = validation.OriginalFileName;
        var extension = validation.Extension;

        var storedFileName = $"{Guid.NewGuid():N}{extension}";
        var relativePath = Path.Combine(organizationId.ToString(), documentId.ToString(), $"v{versionNumber}", storedFileName)
            .Replace("\\", "/");
        var absolutePath = BuildAbsolutePath(relativePath);
        var directory = Path.GetDirectoryName(absolutePath) ?? _storageRoot;

        Directory.CreateDirectory(directory);

        await using var targetStream = new FileStream(absolutePath, FileMode.Create, FileAccess.Write, FileShare.None);
        await file.CopyToAsync(targetStream, cancellationToken);

        return new StoredDocumentFileResult
        {
            RelativePath = relativePath,
            StoredFileName = storedFileName,
            OriginalFileName = originalFileName,
            ContentType = ResolveContentType(extension),
            Extension = extension,
            Size = file.Length
        };
    }

    public Task<Stream> OpenReadAsync(string relativePath, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var absolutePath = BuildAbsolutePath(relativePath);
        if (!File.Exists(absolutePath))
        {
            throw new FileNotFoundException("Stored document file could not be found", absolutePath);
        }

        Stream stream = new FileStream(absolutePath, FileMode.Open, FileAccess.Read, FileShare.Read);
        return Task.FromResult(stream);
    }

    public Task DeleteFileAsync(string relativePath, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        if (string.IsNullOrWhiteSpace(relativePath))
        {
            return Task.CompletedTask;
        }

        var absolutePath = BuildAbsolutePath(relativePath);
        if (File.Exists(absolutePath))
        {
            File.Delete(absolutePath);
        }

        return Task.CompletedTask;
    }

    public string ResolveContentType(string fileNameOrExtension)
    {
        return DocumentStorageValidation.ResolveContentType(fileNameOrExtension);
    }

    private string BuildAbsolutePath(string relativePath)
    {
        var normalizedRelative = relativePath.Replace('/', Path.DirectorySeparatorChar);
        return Path.Combine(_storageRoot, normalizedRelative);
    }
}