using System.ComponentModel.DataAnnotations;

namespace InnoTrack.RDMS.Api.Application.Dtos.Documents;

public class UpdateDocumentDto
{
    [Required]
    [MaxLength(255)]
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }
    public string? References { get; set; }
    public Guid? ProjectId { get; set; }
    public int? CategoryId { get; set; }
    public List<string> Tags { get; set; } = new();
    public bool IsArchived { get; set; }
}