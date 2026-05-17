using System.ComponentModel.DataAnnotations;
using InnoTrack.RDMS.Api.Domain.Enums;

namespace InnoTrack.RDMS.Api.Application.Dtos.Collaboration;

public class UpdateAnnouncementDto
{
    [Required]
    [MaxLength(255)]
    public string Title { get; set; } = string.Empty;

    [Required]
    public string Content { get; set; } = string.Empty;

    public Guid? ProjectId { get; set; }
    public AnnouncementPriority Priority { get; set; } = AnnouncementPriority.Normal;
    public bool IsPublished { get; set; }
    public DateTime? ExpiresAt { get; set; }
}