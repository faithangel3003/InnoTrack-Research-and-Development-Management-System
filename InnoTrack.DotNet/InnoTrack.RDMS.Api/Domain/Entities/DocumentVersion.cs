namespace InnoTrack.RDMS.Api.Domain.Entities;

public class DocumentVersion : BaseEntity
{
    public Guid DocumentId { get; set; }
    public int VersionNumber { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public Guid UploadedByUserId { get; set; }
    public string? ChangeNotes { get; set; }

    public Document Document { get; set; } = null!;
    public AppUser UploadedByUser { get; set; } = null!;
}