namespace InnoTrack.RDMS.Api.Domain.Entities;

public class DocumentTagMap
{
    public Guid DocumentId { get; set; }
    public int TagId { get; set; }

    public Document Document { get; set; } = null!;
    public DocumentTag Tag { get; set; } = null!;
}