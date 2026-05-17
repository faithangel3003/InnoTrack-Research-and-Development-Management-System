namespace InnoTrack.RDMS.Api.Domain.Entities;

public class DocumentCategory
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid OrganizationId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Organization Organization { get; set; } = null!;
    public ICollection<Document> Documents { get; set; } = new List<Document>();
}