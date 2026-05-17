using InnoTrack.RDMS.Api.Application.Dtos.Users;
using InnoTrack.RDMS.Api.Application.Interfaces.Repositories;
using InnoTrack.RDMS.Api.Application.Interfaces.Services;
using InnoTrack.RDMS.Api.Domain.Enums;

namespace InnoTrack.RDMS.Api.Application.Services;

public class UserService(
    IUserRepository userRepository,
    IRoleRepository roleRepository,
    ITeamRepository teamRepository,
    IAuditLogService auditLogService,
    IAuthService authService) : IUserService
{
    public async Task<List<UserDto>> GetAllUsersAsync(Guid actorUserId, string actorRole, CancellationToken cancellationToken = default)
    {
        var actor = await userRepository.GetByIdAsync(actorUserId, cancellationToken)
            ?? throw new UnauthorizedAccessException("Actor does not exist");

        var normalizedRole = NormalizeRole(actorRole);
        var users = normalizedRole == "superadmin"
            ? await userRepository.GetAllAsync(cancellationToken)
            : actor.OrganizationId.HasValue
                ? await userRepository.GetByOrganizationAsync(actor.OrganizationId.Value, cancellationToken)
                : new List<Domain.Entities.AppUser>();

        return users.Select(MapToDto).ToList();
    }

    public async Task<UserDto?> GetUserByIdAsync(Guid id, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default)
    {
        var user = await userRepository.GetByIdAsync(id, cancellationToken);
        if (user is null)
        {
            return null;
        }

        var actor = await userRepository.GetByIdAsync(actorUserId, cancellationToken)
            ?? throw new UnauthorizedAccessException("Actor does not exist");

        EnsureSystemAdminAccess(actor, actorRole, user);
        return MapToDto(user);
    }

    public async Task<UserDto> CreateUserAsync(CreateUserDto request, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var actor = await userRepository.GetByIdAsync(actorUserId, cancellationToken)
            ?? throw new UnauthorizedAccessException("Actor does not exist");

        var normalizedRole = NormalizeRole(actorRole);
        var existing = await userRepository.GetByEmailAsync(request.Email.Trim(), cancellationToken);
        if (existing is not null)
        {
            throw new InvalidOperationException("User email already exists");
        }

        var role = await roleRepository.GetByIdAsync(request.RoleId, cancellationToken);
        if (role is null)
        {
            throw new InvalidOperationException("Role does not exist");
        }

        var organizationId = request.OrganizationId;
        Domain.Entities.Team? team = null;
        if (normalizedRole == "systemadmin")
        {
            if (!actor.OrganizationId.HasValue)
            {
                throw new UnauthorizedAccessException("SystemAdmin must belong to an organization");
            }

            if (role.Id == (int)AppRole.SuperAdmin)
            {
                throw new UnauthorizedAccessException("SystemAdmin cannot create SuperAdmin accounts");
            }

            organizationId = actor.OrganizationId.Value;
        }

        if (request.TeamId.HasValue)
        {
            team = await teamRepository.GetByIdAsync(request.TeamId.Value, cancellationToken)
                ?? throw new InvalidOperationException("Team does not exist");

            if (normalizedRole == "systemadmin" && actor.OrganizationId != team.OrganizationId)
            {
                throw new UnauthorizedAccessException("SystemAdmin can only assign teams within the same organization");
            }

            if (organizationId.HasValue && organizationId.Value != team.OrganizationId)
            {
                throw new InvalidOperationException("Selected team does not belong to the selected organization");
            }

            organizationId ??= team.OrganizationId;
        }

        var user = new Domain.Entities.AppUser
        {
            Id = Guid.NewGuid(),
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            Email = request.Email.Trim(),
            PasswordHash = authService.HashPassword(request.Password),
            RoleId = request.RoleId,
            OrganizationId = organizationId,
            TeamId = team?.Id,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await userRepository.AddAsync(user, cancellationToken);
        await userRepository.SaveChangesAsync(cancellationToken);

        await auditLogService.LogActionAsync(
            userId: user.Id,
            actorId: actorUserId,
            organizationId: user.OrganizationId,
            action: "users.create",
            module: "users",
            entityId: user.Id,
            severity: "info",
            ipAddress: ipAddress,
            cancellationToken: cancellationToken);

        var created = await userRepository.GetByIdAsync(user.Id, cancellationToken)
            ?? throw new InvalidOperationException("Created user could not be loaded");

        return MapToDto(created);
    }

    public async Task<UserDto?> UpdateUserAsync(Guid id, UpdateUserDto request, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var actor = await userRepository.GetByIdAsync(actorUserId, cancellationToken)
            ?? throw new UnauthorizedAccessException("Actor does not exist");

        var user = await userRepository.GetByIdAsync(id, cancellationToken);
        if (user is null)
        {
            return null;
        }

        EnsureSystemAdminAccess(actor, actorRole, user);

        var emailOwner = await userRepository.GetByEmailAsync(request.Email.Trim(), cancellationToken);
        if (emailOwner is not null && emailOwner.Id != id)
        {
            throw new InvalidOperationException("User email already exists");
        }

        var role = await roleRepository.GetByIdAsync(request.RoleId, cancellationToken);
        if (role is null)
        {
            throw new InvalidOperationException("Role does not exist");
        }

        if (NormalizeRole(actorRole) == "systemadmin" && role.Id == (int)AppRole.SuperAdmin)
        {
            throw new UnauthorizedAccessException("SystemAdmin cannot assign the SuperAdmin role");
        }

        user.FirstName = request.FirstName.Trim();
        user.LastName = request.LastName.Trim();
        user.Email = request.Email.Trim();
        user.RoleId = request.RoleId;
        var resolvedOrganizationId = NormalizeRole(actorRole) == "systemadmin" ? actor.OrganizationId : request.OrganizationId;

        if (request.TeamId.HasValue)
        {
            var team = await teamRepository.GetByIdAsync(request.TeamId.Value, cancellationToken)
                ?? throw new InvalidOperationException("Team does not exist");

            if (NormalizeRole(actorRole) == "systemadmin" && actor.OrganizationId != team.OrganizationId)
            {
                throw new UnauthorizedAccessException("SystemAdmin can only assign teams within the same organization");
            }

            if (resolvedOrganizationId.HasValue && resolvedOrganizationId.Value != team.OrganizationId)
            {
                throw new InvalidOperationException("Selected team does not belong to the selected organization");
            }

            resolvedOrganizationId ??= team.OrganizationId;
            user.TeamId = team.Id;
        }
        else
        {
            user.TeamId = null;
        }

        user.OrganizationId = resolvedOrganizationId;
        user.IsActive = request.IsActive;
        user.UpdatedAt = DateTime.UtcNow;

        await userRepository.SaveChangesAsync(cancellationToken);

        await auditLogService.LogActionAsync(
            userId: user.Id,
            actorId: actorUserId,
            organizationId: user.OrganizationId,
            action: "users.update",
            module: "users",
            entityId: user.Id,
            severity: "info",
            ipAddress: ipAddress,
            cancellationToken: cancellationToken);

        var updated = await userRepository.GetByIdAsync(user.Id, cancellationToken)
            ?? throw new InvalidOperationException("Updated user could not be loaded");

        return MapToDto(updated);
    }

    public async Task<bool> DeactivateUserAsync(Guid id, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var actor = await userRepository.GetByIdAsync(actorUserId, cancellationToken)
            ?? throw new UnauthorizedAccessException("Actor does not exist");

        var user = await userRepository.GetByIdAsync(id, cancellationToken);
        if (user is null)
        {
            return false;
        }

        EnsureSystemAdminAccess(actor, actorRole, user);

        user.IsActive = false;
        user.UpdatedAt = DateTime.UtcNow;

        await userRepository.SaveChangesAsync(cancellationToken);

        await auditLogService.LogActionAsync(
            userId: user.Id,
            actorId: actorUserId,
            organizationId: user.OrganizationId,
            action: "users.deactivate",
            module: "users",
            entityId: user.Id,
            severity: "warning",
            ipAddress: ipAddress,
            cancellationToken: cancellationToken);

        return true;
    }

    public async Task<bool> ChangeRoleAsync(Guid id, int roleId, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var actor = await userRepository.GetByIdAsync(actorUserId, cancellationToken)
            ?? throw new UnauthorizedAccessException("Actor does not exist");

        var user = await userRepository.GetByIdAsync(id, cancellationToken);
        if (user is null)
        {
            return false;
        }

        EnsureSystemAdminAccess(actor, actorRole, user);

        var role = await roleRepository.GetByIdAsync(roleId, cancellationToken);
        if (role is null)
        {
            throw new InvalidOperationException("Role does not exist");
        }

        if (NormalizeRole(actorRole) == "systemadmin" && role.Id == (int)AppRole.SuperAdmin)
        {
            throw new UnauthorizedAccessException("SystemAdmin cannot assign the SuperAdmin role");
        }

        user.RoleId = roleId;
        user.UpdatedAt = DateTime.UtcNow;

        await userRepository.SaveChangesAsync(cancellationToken);

        await auditLogService.LogActionAsync(
            userId: user.Id,
            actorId: actorUserId,
            organizationId: user.OrganizationId,
            action: "users.change-role",
            module: "users",
            entityId: user.Id,
            severity: "info",
            ipAddress: ipAddress,
            cancellationToken: cancellationToken);

        return true;
    }

    private static string NormalizeRole(string role)
    {
        return role.Replace(" ", string.Empty).Trim().ToLowerInvariant();
    }

    private static void EnsureSystemAdminAccess(Domain.Entities.AppUser actor, string actorRole, Domain.Entities.AppUser targetUser)
    {
        if (NormalizeRole(actorRole) != "systemadmin")
        {
            return;
        }

        if (!actor.OrganizationId.HasValue || actor.OrganizationId != targetUser.OrganizationId)
        {
            throw new UnauthorizedAccessException("SystemAdmin can only manage users within the same organization");
        }

        if (targetUser.RoleId == (int)AppRole.SuperAdmin)
        {
            throw new UnauthorizedAccessException("SystemAdmin cannot manage SuperAdmin accounts");
        }
    }

    private static UserDto MapToDto(Domain.Entities.AppUser user)
    {
        return new UserDto
        {
            Id = user.Id,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Email = user.Email,
            RoleId = user.RoleId,
            RoleName = !string.IsNullOrWhiteSpace(user.Role?.RoleName)
                ? user.Role.RoleName
                : ResolveRoleName(user.RoleId),
            OrganizationId = user.OrganizationId,
            OrganizationName = user.Organization?.Name,
            TeamId = user.TeamId,
            TeamName = user.Team?.Name,
            IsActive = user.IsActive,
            CreatedAtUtc = user.CreatedAt,
            UpdatedAtUtc = user.UpdatedAt
        };
    }

    private static string ResolveRoleName(int roleId)
    {
        if (Enum.IsDefined(typeof(AppRole), roleId))
        {
            return RoleNames.FromEnum((AppRole)roleId);
        }

        return "Unknown";
    }
}
