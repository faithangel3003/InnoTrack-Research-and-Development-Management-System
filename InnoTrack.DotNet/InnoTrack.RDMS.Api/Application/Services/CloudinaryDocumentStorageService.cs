using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using InnoTrack.RDMS.Api.Application.Dtos.Documents;
using InnoTrack.RDMS.Api.Application.Interfaces.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.WebUtilities;

namespace InnoTrack.RDMS.Api.Application.Services;

public class CloudinaryDocumentStorageService : IDocumentStorageService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly LocalDocumentStorageService _localFallback;
    private readonly ILogger<CloudinaryDocumentStorageService> _logger;
    private readonly CloudinaryCredentials? _credentials;
    private readonly Cloudinary? _cloudinary;

    public CloudinaryDocumentStorageService(
        IConfiguration configuration,
        IHttpClientFactory httpClientFactory,
        LocalDocumentStorageService localFallback,
        ILogger<CloudinaryDocumentStorageService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _localFallback = localFallback;
        _logger = logger;
        _credentials = CloudinaryCredentials.Parse(configuration["Cloudinary:Url"] ?? configuration["CLOUDINARY_URL"]);
        _cloudinary = _credentials is null ? null : CreateCloudinaryClient(_credentials);
    }

    public async Task<StoredDocumentFileResult> SaveFileAsync(IFormFile file, Guid organizationId, Guid documentId, int versionNumber, CancellationToken cancellationToken = default)
    {
        if (_credentials is null)
        {
            _logger.LogWarning("Cloudinary document storage is not configured. Falling back to local storage.");
            return await _localFallback.SaveFileAsync(file, organizationId, documentId, versionNumber, cancellationToken);
        }

        var validation = DocumentStorageValidation.ValidateFile(file);
        var publicId = $"{organizationId:N}/{documentId:N}/v{versionNumber}/{Guid.NewGuid():N}{validation.Extension}";

        await using var fileStream = file.OpenReadStream();
        var uploadParams = new RawUploadParams
        {
            File = new FileDescription(validation.OriginalFileName, fileStream),
            PublicId = publicId,
            Overwrite = false,
            UniqueFilename = false,
            UseFilename = false,
        };

        var uploadResult = await _cloudinary!.UploadAsync(uploadParams, "raw", cancellationToken);
        if (uploadResult.Error is not null)
        {
            throw new InvalidOperationException($"Cloudinary upload failed: {uploadResult.Error.Message}");
        }

        var secureUrl = uploadResult.SecureUrl?.ToString();
        var returnedPublicId = uploadResult.PublicId;
        var fileSize = uploadResult.Bytes > 0 ? uploadResult.Bytes : file.Length;

        if (string.IsNullOrWhiteSpace(secureUrl) || string.IsNullOrWhiteSpace(returnedPublicId))
        {
            throw new InvalidOperationException("Cloudinary upload response was missing file metadata.");
        }

        var localBackupPath = await TryCreateLocalBackupAsync(file, organizationId, documentId, versionNumber, validation.Extension, cancellationToken);

        return new StoredDocumentFileResult
        {
            RelativePath = BuildStorageReference(returnedPublicId, secureUrl, localBackupPath),
            StoredFileName = Path.GetFileName(returnedPublicId),
            OriginalFileName = validation.OriginalFileName,
            ContentType = DocumentStorageValidation.ResolveContentType(validation.Extension),
            Extension = validation.Extension,
            Size = fileSize,
        };
    }

    public async Task<Stream> OpenReadAsync(string relativePath, CancellationToken cancellationToken = default)
    {
        if (!TryParseStorageReference(relativePath, out var storageReference))
        {
            return await _localFallback.OpenReadAsync(relativePath, cancellationToken);
        }

        var client = _httpClientFactory.CreateClient("CloudinaryDocuments");
        try
        {
            using var response = await client.GetAsync(storageReference.SecureUrl, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
            if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                throw new FileNotFoundException("Stored Cloudinary document file could not be found.", storageReference.SecureUrl);
            }

            response.EnsureSuccessStatusCode();
            var content = await response.Content.ReadAsByteArrayAsync(cancellationToken);
            return new MemoryStream(content);
        }
        catch (HttpRequestException) when (!string.IsNullOrWhiteSpace(storageReference.LocalBackupPath))
        {
            _logger.LogWarning("Cloudinary download failed for {SecureUrl}. Falling back to local backup {LocalBackupPath}.", storageReference.SecureUrl, storageReference.LocalBackupPath);
            return await _localFallback.OpenReadAsync(storageReference.LocalBackupPath, cancellationToken);
        }
    }

    public async Task DeleteFileAsync(string relativePath, CancellationToken cancellationToken = default)
    {
        if (!TryParseStorageReference(relativePath, out var storageReference))
        {
            await _localFallback.DeleteFileAsync(relativePath, cancellationToken);
            return;
        }

        if (_credentials is null)
        {
            throw new InvalidOperationException("Cloudinary configuration is required to delete remote document files.");
        }

        var deleteParams = new DeletionParams(storageReference.PublicId)
        {
            ResourceType = ResourceType.Raw,
            Invalidate = true,
        };

        var deleteResult = await _cloudinary!.DestroyAsync(deleteParams);
        if (deleteResult.Error is not null)
        {
            throw new InvalidOperationException($"Cloudinary delete failed: {deleteResult.Error.Message}");
        }

        var result = deleteResult.Result;

        if (!string.Equals(result, "ok", StringComparison.OrdinalIgnoreCase)
            && !string.Equals(result, "not found", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException($"Unexpected Cloudinary delete result: {result}");
        }

        if (!string.IsNullOrWhiteSpace(storageReference.LocalBackupPath))
        {
            await _localFallback.DeleteFileAsync(storageReference.LocalBackupPath, cancellationToken);
        }
    }

    public string ResolveContentType(string fileNameOrExtension)
    {
        return DocumentStorageValidation.ResolveContentType(fileNameOrExtension);
    }

    private async Task<string?> TryCreateLocalBackupAsync(IFormFile file, Guid organizationId, Guid documentId, int versionNumber, string extension, CancellationToken cancellationToken)
    {
        if (!string.Equals(extension, ".pdf", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        try
        {
            var localBackup = await _localFallback.SaveFileAsync(file, organizationId, documentId, versionNumber, cancellationToken);
            return localBackup.RelativePath;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Cloudinary PDF upload succeeded but local backup creation failed for document {DocumentId} version {VersionNumber}.", documentId, versionNumber);
            return null;
        }
    }

    private static string BuildStorageReference(string publicId, string secureUrl, string? localBackupPath)
    {
        var reference = $"cloudinary://raw/{Uri.EscapeDataString(publicId)}?url={Uri.EscapeDataString(secureUrl)}";
        if (!string.IsNullOrWhiteSpace(localBackupPath))
        {
            reference += $"&local={Uri.EscapeDataString(localBackupPath)}";
        }

        return reference;
    }

    private static bool TryParseStorageReference(string relativePath, out CloudinaryStorageReference storageReference)
    {
        storageReference = default;

        if (string.IsNullOrWhiteSpace(relativePath) || !relativePath.StartsWith("cloudinary://raw/", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        var separatorIndex = relativePath.IndexOf('?');
        if (separatorIndex < 0)
        {
            return false;
        }

        var publicId = Uri.UnescapeDataString(relativePath[17..separatorIndex]);
        var query = QueryHelpers.ParseQuery(relativePath[separatorIndex..]);
        var secureUrl = query.TryGetValue("url", out var values)
            ? values.ToString()
            : string.Empty;
        var localBackupPath = query.TryGetValue("local", out var localValues)
            ? localValues.ToString()
            : string.Empty;

        if (string.IsNullOrWhiteSpace(publicId) || string.IsNullOrWhiteSpace(secureUrl))
        {
            return false;
        }

        storageReference = new CloudinaryStorageReference(publicId, secureUrl, localBackupPath);
        return true;
    }

    private static Cloudinary CreateCloudinaryClient(CloudinaryCredentials credentials)
    {
        var cloudinary = new Cloudinary(new Account(credentials.CloudName, credentials.ApiKey, credentials.ApiSecret));
        cloudinary.Api.Secure = true;
        return cloudinary;
    }

    private readonly record struct CloudinaryStorageReference(string PublicId, string SecureUrl, string? LocalBackupPath);

    private sealed class CloudinaryCredentials
    {
        private CloudinaryCredentials(string cloudName, string apiKey, string apiSecret)
        {
            CloudName = cloudName;
            ApiKey = apiKey;
            ApiSecret = apiSecret;
        }

        public string CloudName { get; }
        public string ApiKey { get; }
        public string ApiSecret { get; }
        public string RawUploadUrl => $"https://api.cloudinary.com/v1_1/{CloudName}/raw/upload";
        public string RawDestroyUrl => $"https://api.cloudinary.com/v1_1/{CloudName}/raw/destroy";

        public static CloudinaryCredentials? Parse(string? cloudinaryUrl)
        {
            if (string.IsNullOrWhiteSpace(cloudinaryUrl))
            {
                return null;
            }

            var trimmed = cloudinaryUrl.Trim();
            const string prefix = "cloudinary://";
            if (!trimmed.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("CLOUDINARY_URL is invalid. Expected format: cloudinary://api_key:api_secret@cloud_name");
            }

            var payload = trimmed[prefix.Length..];
            var atIndex = payload.LastIndexOf('@');
            if (atIndex <= 0 || atIndex == payload.Length - 1)
            {
                throw new InvalidOperationException("CLOUDINARY_URL is missing the API key, API secret, or cloud name.");
            }

            var credentialsPart = payload[..atIndex];
            var cloudName = payload[(atIndex + 1)..].Trim();
            var credentialSeparator = credentialsPart.IndexOf(':');
            if (credentialSeparator <= 0 || credentialSeparator == credentialsPart.Length - 1 || string.IsNullOrWhiteSpace(cloudName))
            {
                throw new InvalidOperationException("CLOUDINARY_URL is missing the API key, API secret, or cloud name.");
            }

            var apiKey = credentialsPart[..credentialSeparator].Trim();
            var apiSecret = credentialsPart[(credentialSeparator + 1)..].Trim();
            if (string.IsNullOrWhiteSpace(apiKey) || string.IsNullOrWhiteSpace(apiSecret))
            {
                throw new InvalidOperationException("CLOUDINARY_URL is missing the API key or API secret.");
            }

            return new CloudinaryCredentials(cloudName, apiKey, apiSecret);
        }
    }
}