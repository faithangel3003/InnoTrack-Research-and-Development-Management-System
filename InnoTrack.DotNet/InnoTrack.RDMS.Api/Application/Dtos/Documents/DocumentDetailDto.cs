namespace InnoTrack.RDMS.Api.Application.Dtos.Documents;

public class DocumentDetailDto : DocumentDto
{
    public List<DocumentVersionDto> Versions { get; set; } = new();
    public List<DocumentAccessLogDto> AccessLogs { get; set; } = new();
}