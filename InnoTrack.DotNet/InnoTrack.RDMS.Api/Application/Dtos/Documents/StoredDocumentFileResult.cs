namespace InnoTrack.RDMS.Api.Application.Dtos.Documents;

public class StoredDocumentFileResult
{
    public string RelativePath { get; set; } = string.Empty;
    public string StoredFileName { get; set; } = string.Empty;
    public string OriginalFileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public string Extension { get; set; } = string.Empty;
    public long Size { get; set; }
}