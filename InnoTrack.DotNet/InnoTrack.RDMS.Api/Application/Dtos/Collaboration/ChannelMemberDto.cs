using InnoTrack.RDMS.Api.Domain.Enums;

namespace InnoTrack.RDMS.Api.Application.Dtos.Collaboration;

public class ChannelMemberDto
{
    public Guid Id { get; set; }
    public Guid ChannelId { get; set; }
    public Guid UserId { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public ChannelMemberRole Role { get; set; }
    public DateTime JoinedAt { get; set; }
    public DateTime? LastReadAt { get; set; }
}