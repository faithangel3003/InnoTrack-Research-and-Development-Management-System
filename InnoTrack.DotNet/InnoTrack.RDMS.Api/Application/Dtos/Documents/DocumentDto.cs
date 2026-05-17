namespace InnoTrack.RDMS.Api.Application.Dtos.Documents;

public class DocumentDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? References { get; set; }
    public string OriginalFileName { get; set; } = string.Empty;
    public string FileType { get; set; } = string.Empty;
    public string FileExtension { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public int Version { get; set; }
    public bool IsArchived { get; set; }
    public Guid? ProjectId { get; set; }
    public string? ProjectTitle { get; set; }
    public int? CategoryId { get; set; }
    public string? CategoryName { get; set; }
    public Guid UploadedByUserId { get; set; }
    public string UploadedByName { get; set; } = string.Empty;
    public Guid OrganizationId { get; set; }
    public List<string> Tags { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}