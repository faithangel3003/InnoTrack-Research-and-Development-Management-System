namespace InnoTrack.RDMS.Api.Application.Services;

internal static class CollaborationAuthorizationHelper
{
    public static string NormalizeRole(string role)
    {
        return role.Replace(" ", string.Empty).Trim().ToLowerInvariant();
    }

    public static bool IsSuperAdmin(string role) => NormalizeRole(role) == "superadmin";

    public static bool IsOrganizationAdmin(string role)
    {
        var normalized = NormalizeRole(role);
        return normalized is "superadmin" or "systemadmin";
    }

    public static bool CanCreateChannels(string role)
    {
        var normalized = NormalizeRole(role);
        return normalized is "superadmin" or "systemadmin" or "projectmanager";
    }

    public static bool CanPostAnnouncements(string role)
    {
        var normalized = NormalizeRole(role);
        return normalized is "superadmin" or "systemadmin" or "projectmanager";
    }

    public static string ResolveUserName(Domain.Entities.AppUser? user)
    {
        if (user is null)
        {
            return "Unknown User";
        }

        var fullName = $"{user.FirstName} {user.LastName}".Trim();
        return string.IsNullOrWhiteSpace(fullName) ? user.Email : fullName;
    }
}