using System.ComponentModel.DataAnnotations;
using InnoTrack.RDMS.Api.Domain.Enums;

namespace InnoTrack.RDMS.Api.Application.Dtos.Collaboration;

public class CreateAnnouncementDto
{
    [Required]
    [MaxLength(255)]
    public string Title { get; set; } = string.Empty;

    [Required]
    public string Content { get; set; } = string.Empty;

    public Guid? ProjectId { get; set; }
    public Guid? OrganizationId { get; set; }
    public AnnouncementPriority Priority { get; set; } = AnnouncementPriority.Normal;
    public bool PublishImmediately { get; set; } = true;
    public DateTime? ExpiresAt { get; set; }
}