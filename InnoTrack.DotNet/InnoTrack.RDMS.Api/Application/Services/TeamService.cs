using InnoTrack.RDMS.Api.Application.Dtos.Teams;
using InnoTrack.RDMS.Api.Application.Interfaces.Repositories;
using InnoTrack.RDMS.Api.Application.Interfaces.Services;
using InnoTrack.RDMS.Api.Domain.Entities;

namespace InnoTrack.RDMS.Api.Application.Services;

public class TeamService(
    ITeamRepository teamRepository,
    IUserRepository userRepository,
    IAuditLogService auditLogService) : ITeamService
{
    public async Task<List<TeamDto>> GetTeamsAsync(Guid actorUserId, string actorRole, Guid? organizationId, CancellationToken cancellationToken = default)
    {
        var actor = await userRepository.GetByIdAsync(actorUserId, cancellationToken)
            ?? throw new UnauthorizedAccessException("Actor does not exist");

        var resolvedOrganizationId = await ResolveOrganizationIdAsync(actor, actorRole, organizationId, requireExplicitOrganizationForSuperAdmin: false, cancellationToken);
        if (!resolvedOrganizationId.HasValue)
        {
            return [];
        }

        var teams = await teamRepository.GetByOrganizationAsync(resolvedOrganizationId.Value, cancellationToken);
        return teams.Select(MapToDto).ToList();
    }

    public async Task<TeamDto?> GetTeamByIdAsync(Guid id, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default)
    {
        var actor = await userRepository.GetByIdAsync(actorUserId, cancellationToken)
            ?? throw new UnauthorizedAccessException("Actor does not exist");

        var team = await teamRepository.GetByIdAsync(id, cancellationToken);
        if (team is null)
        {
            return null;
        }

        EnsureTeamAccess(actor, actorRole, team);
        return MapToDto(team);
    }

    public async Task<TeamDto> CreateTeamAsync(CreateTeamDto request, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var actor = await userRepository.GetByIdAsync(actorUserId, cancellationToken)
            ?? throw new UnauthorizedAccessException("Actor does not exist");

        var organizationId = await ResolveOrganizationIdAsync(actor, actorRole, request.OrganizationId, requireExplicitOrganizationForSuperAdmin: true, cancellationToken)
            ?? throw new InvalidOperationException("Organization is required");

        if (!await teamRepository.OrganizationExistsAsync(organizationId, cancellationToken))
        {
            throw new InvalidOperationException("Organization does not exist");
        }

        var teamName = request.Name.Trim();
        if (await teamRepository.ExistsByNameAsync(organizationId, teamName, cancellationToken: cancellationToken))
        {
            throw new InvalidOperationException("A team with that name already exists for this organization");
        }

        var team = new Team
        {
            Id = Guid.NewGuid(),
            OrganizationId = organizationId,
            Name = teamName,
            Description = NormalizeDescription(request.Description),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        await teamRepository.AddAsync(team, cancellationToken);
        await teamRepository.SaveChangesAsync(cancellationToken);

        await auditLogService.LogActionAsync(
            userId: actorUserId,
            actorId: actorUserId,
            organizationId: organizationId,
            action: "teams.create",
            module: "teams",
            entityId: team.Id,
            severity: "info",
            ipAddress: ipAddress,
            cancellationToken: cancellationToken);

        var created = await teamRepository.GetByIdAsync(team.Id, cancellationToken)
            ?? throw new InvalidOperationException("Created team could not be loaded");

        return MapToDto(created);
    }

    public async Task<TeamDto?> UpdateTeamAsync(Guid id, UpdateTeamDto request, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var actor = await userRepository.GetByIdAsync(actorUserId, cancellationToken)
            ?? throw new UnauthorizedAccessException("Actor does not exist");

        var team = await teamRepository.GetByIdAsync(id, cancellationToken);
        if (team is null)
        {
            return null;
        }

        EnsureTeamAccess(actor, actorRole, team);

        var teamName = request.Name.Trim();
        if (await teamRepository.ExistsByNameAsync(team.OrganizationId, teamName, id, cancellationToken))
        {
            throw new InvalidOperationException("A team with that name already exists for this organization");
        }

        team.Name = teamName;
        team.Description = NormalizeDescription(request.Description);
        team.UpdatedAt = DateTime.UtcNow;

        await teamRepository.SaveChangesAsync(cancellationToken);

        await auditLogService.LogActionAsync(
            userId: actorUserId,
            actorId: actorUserId,
            organizationId: team.OrganizationId,
            action: "teams.update",
            module: "teams",
            entityId: team.Id,
            severity: "info",
            ipAddress: ipAddress,
            cancellationToken: cancellationToken);

        var updated = await teamRepository.GetByIdAsync(team.Id, cancellationToken)
            ?? throw new InvalidOperationException("Updated team could not be loaded");

        return MapToDto(updated);
    }

    public async Task<bool> DeleteTeamAsync(Guid id, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var actor = await userRepository.GetByIdAsync(actorUserId, cancellationToken)
            ?? throw new UnauthorizedAccessException("Actor does not exist");

        var team = await teamRepository.GetByIdAsync(id, cancellationToken);
        if (team is null)
        {
            return false;
        }

        EnsureTeamAccess(actor, actorRole, team);

        await teamRepository.UnassignUsersAsync(team.Id, cancellationToken);
        teamRepository.Remove(team);
        await teamRepository.SaveChangesAsync(cancellationToken);

        await auditLogService.LogActionAsync(
            userId: actorUserId,
            actorId: actorUserId,
            organizationId: team.OrganizationId,
            action: "teams.delete",
            module: "teams",
            entityId: team.Id,
            severity: "warning",
            ipAddress: ipAddress,
            cancellationToken: cancellationToken);

        return true;
    }

    private async Task<Guid?> ResolveOrganizationIdAsync(AppUser actor, string actorRole, Guid? requestedOrganizationId, bool requireExplicitOrganizationForSuperAdmin, CancellationToken cancellationToken)
    {
        var normalizedRole = NormalizeRole(actorRole);

        if (normalizedRole == "superadmin")
        {
            if (!requestedOrganizationId.HasValue)
            {
                if (requireExplicitOrganizationForSuperAdmin)
                {
                    throw new InvalidOperationException("Organization is required");
                }

                return null;
            }

            if (!await teamRepository.OrganizationExistsAsync(requestedOrganizationId.Value, cancellationToken))
            {
                throw new InvalidOperationException("Organization does not exist");
            }

            return requestedOrganizationId.Value;
        }

        if (!actor.OrganizationId.HasValue)
        {
            throw new UnauthorizedAccessException("Actor must belong to an organization");
        }

        return actor.OrganizationId.Value;
    }

    private static void EnsureTeamAccess(AppUser actor, string actorRole, Team team)
    {
        if (NormalizeRole(actorRole) == "superadmin")
        {
            return;
        }

        if (!actor.OrganizationId.HasValue || actor.OrganizationId.Value != team.OrganizationId)
        {
            throw new UnauthorizedAccessException("You can only manage teams inside your organization");
        }
    }

    private static string NormalizeRole(string role)
    {
        return role.Replace(" ", string.Empty).Trim().ToLowerInvariant();
    }

    private static string? NormalizeDescription(string? description)
    {
        var trimmed = description?.Trim();
        return string.IsNullOrWhiteSpace(trimmed) ? null : trimmed;
    }

    private static TeamDto MapToDto(Team team)
    {
        return new TeamDto
        {
            Id = team.Id,
            OrganizationId = team.OrganizationId,
            Name = team.Name,
            Description = team.Description,
            MemberCount = team.Users.Count,
            CreatedAtUtc = team.CreatedAt,
            UpdatedAtUtc = team.UpdatedAt,
        };
    }
}