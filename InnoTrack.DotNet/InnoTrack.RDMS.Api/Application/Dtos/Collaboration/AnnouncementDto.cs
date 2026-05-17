using InnoTrack.RDMS.Api.Domain.Enums;

namespace InnoTrack.RDMS.Api.Application.Dtos.Collaboration;

public class AnnouncementDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public Guid PostedByUserId { get; set; }
    public string PostedByName { get; set; } = string.Empty;
    public Guid OrganizationId { get; set; }
    public Guid? ProjectId { get; set; }
    public string? ProjectTitle { get; set; }
    public AnnouncementPriority Priority { get; set; }
    public bool IsPublished { get; set; }
    public DateTime? PublishedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public int ReadCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}