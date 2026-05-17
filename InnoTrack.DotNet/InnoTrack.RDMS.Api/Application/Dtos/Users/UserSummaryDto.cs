namespace InnoTrack.RDMS.Api.Application.Dtos.Users;

public class UserSummaryDto
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public Guid? OrganizationId { get; set; }
    public bool IsActive { get; set; }
    public List<string> Roles { get; set; } = new();
}
