namespace InnoTrack.RDMS.Api.Domain.Enums;

public static class RoleNames
{
    public const string SuperAdmin = "Super Admin";
    public const string SystemAdmin = "System Admin";
    public const string ProjectManager = "Project Manager";
    public const string TeamMember = "Team Member";

    public static string FromEnum(AppRole role)
    {
        return role switch
        {
            AppRole.SuperAdmin => SuperAdmin,
            AppRole.SystemAdmin => SystemAdmin,
            AppRole.ProjectManager => ProjectManager,
            AppRole.TeamMember => TeamMember,
            _ => TeamMember
        };
    }
}
