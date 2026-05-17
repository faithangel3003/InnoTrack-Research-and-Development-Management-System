using System.ComponentModel.DataAnnotations;
using InnoTrack.RDMS.Api.Domain.Enums;

namespace InnoTrack.RDMS.Api.Application.Dtos.Collaboration;

public class AddChannelMemberDto
{
    [Required]
    public Guid UserId { get; set; }

    public ChannelMemberRole Role { get; set; } = ChannelMemberRole.Member;
}