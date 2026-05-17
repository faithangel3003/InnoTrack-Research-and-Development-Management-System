using System.ComponentModel.DataAnnotations;

namespace InnoTrack.RDMS.Api.Application.Dtos.Documents;

public class CreateDocumentTagDto
{
    [Required]
    [MaxLength(80)]
    public string Name { get; set; } = string.Empty;

    public Guid? OrganizationId { get; set; }
}