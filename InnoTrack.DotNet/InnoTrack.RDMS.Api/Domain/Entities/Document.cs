namespace InnoTrack.RDMS.Api.Domain.Entities;

public class Document : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? References { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string OriginalFileName { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public string FileType { get; set; } = string.Empty;
    public string FileExtension { get; set; } = string.Empty;
    public Guid? ProjectId { get; set; }
    public int? CategoryId { get; set; }
    public Guid UploadedByUserId { get; set; }
    public Guid OrganizationId { get; set; }
    public int Version { get; set; } = 1;
    public bool IsArchived { get; set; }
    public DateTime? DeletedAt { get; set; }

    public Project? Project { get; set; }
    public DocumentCategory? Category { get; set; }
    public AppUser UploadedByUser { get; set; } = null!;
    public Organization Organization { get; set; } = null!;
    public ICollection<DocumentVersion> Versions { get; set; } = new List<DocumentVersion>();
    public ICollection<DocumentTagMap> TagMappings { get; set; } = new List<DocumentTagMap>();
    public ICollection<DocumentAccessLog> AccessLogs { get; set; } = new List<DocumentAccessLog>();
}