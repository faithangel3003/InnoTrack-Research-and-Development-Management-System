using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace InnoTrack.RDMS.Api.Application.Dtos.Documents;

public class AddDocumentVersionDto
{
    [Required]
    public IFormFile File { get; set; } = null!;

    public string? ChangeNotes { get; set; }
}