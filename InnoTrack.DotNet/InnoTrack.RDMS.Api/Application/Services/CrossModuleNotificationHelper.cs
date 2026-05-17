using InnoTrack.RDMS.Api.Domain.Entities;
using InnoTrack.RDMS.Api.Domain.Enums;
using InnoTrack.RDMS.Api.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace InnoTrack.RDMS.Api.Application.Services;

internal static class CrossModuleNotificationHelper
{
    public static async Task<List<Guid>> GetOrganizationAdminUserIdsAsync(AppDbContext dbContext, Guid organizationId, Guid actorUserId, CancellationToken cancellationToken = default)
    {
        var adminUserIds = await dbContext.Users
            .Where(user => user.IsActive && user.OrganizationId == organizationId)
            .Where(user => user.RoleId == (int)AppRole.SystemAdmin
                || user.RoleId == (int)AppRole.SuperAdmin
                || user.Roles.Any(role => role.OrganizationId == organizationId
                    && (role.Role == AppRole.SystemAdmin || role.Role == AppRole.SuperAdmin)))
            .Select(user => user.Id)
            .Distinct()
            .ToListAsync(cancellationToken);

        return adminUserIds
            .Where(userId => userId != actorUserId)
            .Distinct()
            .ToList();
    }

    public static async Task<List<Guid>> GetProjectStakeholderUserIdsAsync(AppDbContext dbContext, Project project, Guid actorUserId, CancellationToken cancellationToken = default)
    {
        var organizationAdminIds = await GetOrganizationAdminUserIdsAsync(dbContext, project.OrganizationId, actorUserId, cancellationToken);

        return project.Members
            .Select(member => member.UserId)
            .Append(project.CreatedByUserId)
            .Concat(organizationAdminIds)
            .Where(userId => userId != Guid.Empty && userId != actorUserId)
            .Distinct()
            .ToList();
    }

    public static async Task<string> ResolveUserDisplayNameAsync(AppDbContext dbContext, Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await dbContext.Users
            .Where(candidate => candidate.Id == userId)
            .Select(candidate => new { candidate.FirstName, candidate.LastName, candidate.Email })
            .FirstOrDefaultAsync(cancellationToken);

        if (user is null)
        {
            return userId.ToString();
        }

        var fullName = $"{user.FirstName} {user.LastName}".Trim();
        return string.IsNullOrWhiteSpace(fullName) ? user.Email : fullName;
    }
}