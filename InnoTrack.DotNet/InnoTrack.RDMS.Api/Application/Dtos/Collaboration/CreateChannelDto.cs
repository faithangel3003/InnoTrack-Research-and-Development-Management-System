using System.ComponentModel.DataAnnotations;
using InnoTrack.RDMS.Api.Domain.Enums;

namespace InnoTrack.RDMS.Api.Application.Dtos.Collaboration;

public class CreateChannelDto
{
    [Required]
    [MaxLength(160)]
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }
    public ChannelType Type { get; set; } = ChannelType.General;
    public Guid? ProjectId { get; set; }
    public Guid? OrganizationId { get; set; }
    public List<Guid> MemberUserIds { get; set; } = new();
}