namespace InnoTrack.RDMS.Api.Application.Dtos.Members;

public class ProjectMemberDto
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public Guid UserId { get; set; }
    public string MemberRole { get; set; } = string.Empty;
    public DateTime JoinedAt { get; set; }
}
