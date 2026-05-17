using Microsoft.AspNetCore.Http;

namespace InnoTrack.RDMS.Api.Application.Services;

internal static class DocumentStorageValidation
{
    internal const long MaxFileSizeBytes = 50L * 1024 * 1024;

    private static readonly Dictionary<string, string[]> AllowedMimeTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        [".pdf"] = ["application/pdf", "application/octet-stream"],
        [".docx"] = ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/octet-stream"],
        [".xlsx"] = ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/octet-stream"],
        [".pptx"] = ["application/vnd.openxmlformats-officedocument.presentationml.presentation", "application/octet-stream"],
        [".txt"] = ["text/plain", "application/octet-stream"],
        [".csv"] = ["text/csv", "application/vnd.ms-excel", "application/octet-stream"],
        [".png"] = ["image/png", "application/octet-stream"],
        [".jpg"] = ["image/jpeg", "application/octet-stream"],
        [".jpeg"] = ["image/jpeg", "application/octet-stream"],
        [".zip"] = ["application/zip", "application/x-zip-compressed", "application/octet-stream"],
        [".rar"] = ["application/vnd.rar", "application/x-rar-compressed", "application/octet-stream"],
    };

    public static DocumentUploadValidationResult ValidateFile(IFormFile file)
    {
        if (file.Length <= 0)
        {
            throw new InvalidOperationException("File cannot be empty");
        }

        if (file.Length > MaxFileSizeBytes)
        {
            throw new InvalidOperationException("File exceeds the 50MB upload limit");
        }

        var originalFileName = Path.GetFileName(file.FileName);
        if (string.IsNullOrWhiteSpace(originalFileName))
        {
            throw new InvalidOperationException("File name is invalid");
        }

        var extension = Path.GetExtension(originalFileName).ToLowerInvariant();
        if (!AllowedMimeTypes.TryGetValue(extension, out var allowedContentTypes))
        {
            throw new InvalidOperationException("File type is not supported");
        }

        if (!string.IsNullOrWhiteSpace(file.ContentType) && !allowedContentTypes.Contains(file.ContentType, StringComparer.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("File MIME type is not allowed");
        }

        return new DocumentUploadValidationResult(originalFileName, extension);
    }

    public static string ResolveContentType(string fileNameOrExtension)
    {
        var extension = fileNameOrExtension.StartsWith('.')
            ? fileNameOrExtension.ToLowerInvariant()
            : Path.GetExtension(fileNameOrExtension).ToLowerInvariant();

        return AllowedMimeTypes.TryGetValue(extension, out var values)
            ? values[0]
            : "application/octet-stream";
    }
}

internal readonly record struct DocumentUploadValidationResult(string OriginalFileName, string Extension);