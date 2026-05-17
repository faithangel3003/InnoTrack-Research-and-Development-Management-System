using System.ComponentModel.DataAnnotations;

namespace InnoTrack.RDMS.Api.Application.Dtos.Comments;

public class CreateTaskCommentDto
{
    [Required]
    [MinLength(1)]
    public string Comment { get; set; } = string.Empty;
}
