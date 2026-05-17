namespace InnoTrack.RDMS.Api.Application.Dtos.Documents;

public class DocumentDownloadResult
{
    public Stream Content { get; set; } = Stream.Null;
    public string ContentType { get; set; } = "application/octet-stream";
    public string FileName { get; set; } = string.Empty;
}