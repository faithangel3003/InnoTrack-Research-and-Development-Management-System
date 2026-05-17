using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace InnoTrack.RDMS.Api.Application.Dtos.Documents;

public class CreateDocumentDto
{
    [Required]
    [MaxLength(255)]
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }
    public string? References { get; set; }
    public Guid? ProjectId { get; set; }
    public int? CategoryId { get; set; }
    public Guid? OrganizationId { get; set; }
    public List<string> Tags { get; set; } = new();

    [Required]
    public IFormFile File { get; set; } = null!;
}