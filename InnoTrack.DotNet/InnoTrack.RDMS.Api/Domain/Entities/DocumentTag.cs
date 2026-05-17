namespace InnoTrack.RDMS.Api.Domain.Entities;

public class DocumentTag
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public Guid OrganizationId { get; set; }

    public Organization Organization { get; set; } = null!;
    public ICollection<DocumentTagMap> DocumentMappings { get; set; } = new List<DocumentTagMap>();
}