using InnoTrack.RDMS.Api.Application.Dtos.Collaboration;
using InnoTrack.RDMS.Api.Application.Interfaces.Repositories;
using InnoTrack.RDMS.Api.Application.Interfaces.Services;
using InnoTrack.RDMS.Api.Domain.Entities;
using InnoTrack.RDMS.Api.Domain.Enums;
using InnoTrack.RDMS.Api.Hubs;
using InnoTrack.RDMS.Api.Infrastructure.Data;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace InnoTrack.RDMS.Api.Application.Services;

public class ChannelService(
    IChannelRepository channelRepository,
    IAuditLogService auditLogService,
    AppDbContext dbContext,
    IHubContext<CollaborationHub> hubContext) : IChannelService
{
    public async Task<List<ChannelDto>> GetUserChannelsAsync(Guid actorUserId, string actorRole, CancellationToken cancellationToken = default)
    {
        var organizationId = await ResolveActorOrganizationIdAsync(actorUserId, cancellationToken);
        if (!organizationId.HasValue)
        {
            return new List<ChannelDto>();
        }

        await EnsureDefaultChannelsAsync(actorUserId, organizationId.Value, cancellationToken);

        var channels = CollaborationAuthorizationHelper.IsOrganizationAdmin(actorRole)
            ? await channelRepository.GetAllAsync(organizationId.Value, false, cancellationToken)
            : await channelRepository.GetByUserAsync(actorUserId, organizationId.Value, false, cancellationToken);

        return channels
            .Select(channel => CollaborationMapper.MapChannel(channel, actorUserId))
            .OrderByDescending(channel => channel.LastActivityAt)
            .ThenBy(channel => channel.Name)
            .ToList();
    }

    public async Task<ChannelDto?> GetChannelByIdAsync(Guid id, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default)
    {
        var channel = await channelRepository.GetByIdAsync(id, true, true, cancellationToken);
        if (channel is null)
        {
            return null;
        }

        await EnsureChannelAccessAsync(channel, actorUserId, actorRole, cancellationToken);
        return CollaborationMapper.MapChannel(channel, actorUserId);
    }

    public async Task<List<ChannelMemberDto>> GetMembersAsync(Guid channelId, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default)
    {
        var channel = await channelRepository.GetByIdAsync(channelId, true, false, cancellationToken)
            ?? throw new InvalidOperationException("Channel not found");

        await EnsureChannelAccessAsync(channel, actorUserId, actorRole, cancellationToken);
        return channel.Members.Select(CollaborationMapper.MapChannelMember).ToList();
    }

    public async Task<List<ChannelDto>> GetProjectChannelsAsync(Guid projectId, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default)
    {
        var project = await dbContext.Projects.FirstOrDefaultAsync(x => x.Id == projectId, cancellationToken)
            ?? throw new InvalidOperationException("Project not found");

        await EnsureProjectAccessAsync(project, actorUserId, actorRole, cancellationToken);
        await EnsureDefaultChannelsAsync(actorUserId, project.OrganizationId, cancellationToken);

        var channels = await channelRepository.GetByProjectAsync(projectId, false, cancellationToken);
        return channels
            .Where(channel => CanAccessChannel(channel, actorUserId, actorRole))
            .Select(channel => CollaborationMapper.MapChannel(channel, actorUserId))
            .OrderByDescending(channel => channel.LastActivityAt)
            .ToList();
    }

    public async Task<ChannelDto> CreateChannelAsync(CreateChannelDto request, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default)
    {
        if (!CollaborationAuthorizationHelper.CanCreateChannels(actorRole))
        {
            throw new UnauthorizedAccessException("You do not have permission to create collaboration channels");
        }

        var organizationId = await ResolveTargetOrganizationIdAsync(actorUserId, actorRole, request.OrganizationId, cancellationToken);
        Project? project = null;
        if (request.ProjectId.HasValue)
        {
            project = await dbContext.Projects
                .Include(x => x.Members)
                .FirstOrDefaultAsync(x => x.Id == request.ProjectId.Value, cancellationToken)
                ?? throw new InvalidOperationException("Project not found");

            if (project.OrganizationId != organizationId)
            {
                throw new InvalidOperationException("Project does not belong to the selected organization");
            }
        }

        var channel = new Channel
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            Type = request.Type,
            ProjectId = request.ProjectId,
            OrganizationId = organizationId,
            CreatedByUserId = actorUserId,
            IsArchived = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        await channelRepository.AddAsync(channel, cancellationToken);

        var memberIds = request.MemberUserIds
            .Append(actorUserId)
            .Distinct()
            .ToList();

        var validUserIds = await GetValidOrganizationUserIdsAsync(organizationId, memberIds, cancellationToken);
        foreach (var userId in validUserIds)
        {
            await channelRepository.AddMemberAsync(new ChannelMember
            {
                Id = Guid.NewGuid(),
                ChannelId = channel.Id,
                UserId = userId,
                Role = userId == actorUserId ? ChannelMemberRole.Owner : ChannelMemberRole.Member,
                JoinedAt = DateTime.UtcNow,
                LastReadAt = userId == actorUserId ? DateTime.UtcNow : null,
            }, cancellationToken);
        }

        await channelRepository.SaveChangesAsync(cancellationToken);
        await auditLogService.LogActionAsync(actorUserId, actorUserId, organizationId, "collaboration.channel.create", "channels", channel.Id, "info", null, cancellationToken);

        var created = await channelRepository.GetByIdAsync(channel.Id, true, true, cancellationToken)
            ?? throw new InvalidOperationException("Channel could not be loaded after creation");

        var dto = CollaborationMapper.MapChannel(created, actorUserId);
        await NotifyChannelUpdatedAsync(created, actorUserId, cancellationToken);
        return dto;
    }

    public async Task<ChannelDto?> UpdateChannelAsync(Guid id, UpdateChannelDto request, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default)
    {
        var channel = await channelRepository.GetByIdAsync(id, true, true, cancellationToken);
        if (channel is null)
        {
            return null;
        }

        await EnsureChannelOwnerOrOrgAdminAsync(channel, actorUserId, actorRole, cancellationToken);

        channel.Name = request.Name.Trim();
        channel.Description = request.Description?.Trim();
        channel.IsArchived = request.IsArchived;
        channel.UpdatedAt = DateTime.UtcNow;
        channelRepository.Update(channel);
        await channelRepository.SaveChangesAsync(cancellationToken);

        await auditLogService.LogActionAsync(actorUserId, actorUserId, channel.OrganizationId, "collaboration.channel.update", "channels", channel.Id, "info", null, cancellationToken);
        await NotifyChannelUpdatedAsync(channel, actorUserId, cancellationToken);
        return CollaborationMapper.MapChannel(channel, actorUserId);
    }

    public async Task<ChannelDto?> ArchiveChannelAsync(Guid id, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default)
    {
        var channel = await channelRepository.GetByIdAsync(id, true, true, cancellationToken);
        if (channel is null)
        {
            return null;
        }

        await EnsureChannelOwnerOrOrgAdminAsync(channel, actorUserId, actorRole, cancellationToken);

        channel.IsArchived = true;
        channel.UpdatedAt = DateTime.UtcNow;
        channelRepository.Update(channel);
        await channelRepository.SaveChangesAsync(cancellationToken);

        await auditLogService.LogActionAsync(actorUserId, actorUserId, channel.OrganizationId, "collaboration.channel.archive", "channels", channel.Id, "info", null, cancellationToken);
        await NotifyChannelUpdatedAsync(channel, actorUserId, cancellationToken);
        return CollaborationMapper.MapChannel(channel, actorUserId);
    }

    public async Task<ChannelMemberDto> AddMemberAsync(Guid channelId, AddChannelMemberDto request, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default)
    {
        var channel = await channelRepository.GetByIdAsync(channelId, true, false, cancellationToken)
            ?? throw new InvalidOperationException("Channel not found");

        await EnsureChannelModeratorAsync(channel, actorUserId, actorRole, cancellationToken);

        var user = await dbContext.Users.FirstOrDefaultAsync(
            x => x.Id == request.UserId && x.OrganizationId == channel.OrganizationId && x.IsActive,
            cancellationToken) ?? throw new InvalidOperationException("User is not active in this organization");

        var existingMember = channel.Members.FirstOrDefault(x => x.UserId == request.UserId);
        if (existingMember is not null)
        {
            existingMember.Role = request.Role;
            existingMember.LastReadAt ??= DateTime.UtcNow;
            await channelRepository.SaveChangesAsync(cancellationToken);
            var reloaded = await channelRepository.GetMemberAsync(channelId, request.UserId, cancellationToken)
                ?? throw new InvalidOperationException("Member could not be loaded");

            return CollaborationMapper.MapChannelMember(reloaded);
        }

        var member = new ChannelMember
        {
            Id = Guid.NewGuid(),
            ChannelId = channelId,
            UserId = request.UserId,
            Role = request.Role,
            JoinedAt = DateTime.UtcNow,
        };

        await channelRepository.AddMemberAsync(member, cancellationToken);
        await channelRepository.SaveChangesAsync(cancellationToken);

        await NotifyChannelUpdatedAsync(channel, actorUserId, cancellationToken);
        var created = await channelRepository.GetMemberAsync(channelId, request.UserId, cancellationToken)
            ?? throw new InvalidOperationException("Added member could not be loaded");

        return CollaborationMapper.MapChannelMember(created);
    }

    public async Task<bool> RemoveMemberAsync(Guid channelId, Guid memberUserId, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default)
    {
        var channel = await channelRepository.GetByIdAsync(channelId, true, false, cancellationToken);
        if (channel is null)
        {
            return false;
        }

        await EnsureChannelModeratorAsync(channel, actorUserId, actorRole, cancellationToken);

        var member = channel.Members.FirstOrDefault(x => x.UserId == memberUserId);
        if (member is null)
        {
            return false;
        }

        if (member.Role == ChannelMemberRole.Owner && channel.Members.Count(x => x.Role == ChannelMemberRole.Owner) == 1)
        {
            throw new InvalidOperationException("Cannot remove the last owner from a collaboration channel");
        }

        channelRepository.RemoveMember(member);
        await channelRepository.SaveChangesAsync(cancellationToken);
        await NotifyChannelUpdatedAsync(channel, actorUserId, cancellationToken);
        return true;
    }

    public async Task<ChannelDto> GetOrCreateDirectMessageChannelAsync(Guid actorUserId, string actorRole, Guid targetUserId, CancellationToken cancellationToken = default)
    {
        var organizationId = await ResolveActorOrganizationIdAsync(actorUserId, cancellationToken)
            ?? throw new UnauthorizedAccessException("User must belong to an organization to create direct channels");

        var targetUser = await dbContext.Users.FirstOrDefaultAsync(
            x => x.Id == targetUserId && x.OrganizationId == organizationId && x.IsActive,
            cancellationToken) ?? throw new InvalidOperationException("Target user is not available in the current organization");

        var existing = await channelRepository.GetDirectMessageAsync(organizationId, actorUserId, targetUserId, cancellationToken);
        if (existing is not null)
        {
            return CollaborationMapper.MapChannel(existing, actorUserId);
        }

        var actor = await dbContext.Users.FirstAsync(x => x.Id == actorUserId, cancellationToken);
        var channel = new Channel
        {
            Id = Guid.NewGuid(),
            Name = $"{CollaborationAuthorizationHelper.ResolveUserName(actor)} / {CollaborationAuthorizationHelper.ResolveUserName(targetUser)}",
            Description = "Direct message channel",
            Type = ChannelType.DirectMessage,
            OrganizationId = organizationId,
            CreatedByUserId = actorUserId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        await channelRepository.AddAsync(channel, cancellationToken);
        await channelRepository.AddMemberAsync(new ChannelMember
        {
            Id = Guid.NewGuid(),
            ChannelId = channel.Id,
            UserId = actorUserId,
            Role = ChannelMemberRole.Owner,
            JoinedAt = DateTime.UtcNow,
            LastReadAt = DateTime.UtcNow,
        }, cancellationToken);
        await channelRepository.AddMemberAsync(new ChannelMember
        {
            Id = Guid.NewGuid(),
            ChannelId = channel.Id,
            UserId = targetUserId,
            Role = ChannelMemberRole.Member,
            JoinedAt = DateTime.UtcNow,
        }, cancellationToken);
        await channelRepository.SaveChangesAsync(cancellationToken);

        var created = await channelRepository.GetByIdAsync(channel.Id, true, true, cancellationToken)
            ?? throw new InvalidOperationException("Direct message channel could not be loaded");

        await NotifyChannelUpdatedAsync(created, actorUserId, cancellationToken);
        return CollaborationMapper.MapChannel(created, actorUserId);
    }

    public async Task MarkChannelAsReadAsync(Guid channelId, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default)
    {
        var channel = await channelRepository.GetByIdAsync(channelId, true, false, cancellationToken)
            ?? throw new InvalidOperationException("Channel not found");

        await EnsureChannelAccessAsync(channel, actorUserId, actorRole, cancellationToken);

        var member = channel.Members.FirstOrDefault(x => x.UserId == actorUserId);
        if (member is null)
        {
            if (!CollaborationAuthorizationHelper.IsOrganizationAdmin(actorRole))
            {
                throw new UnauthorizedAccessException("Only channel members can mark the channel as read");
            }

            member = new ChannelMember
            {
                Id = Guid.NewGuid(),
                ChannelId = channelId,
                UserId = actorUserId,
                Role = ChannelMemberRole.Moderator,
                JoinedAt = DateTime.UtcNow,
            };
            await channelRepository.AddMemberAsync(member, cancellationToken);
        }

        member.LastReadAt = DateTime.UtcNow;
        await channelRepository.SaveChangesAsync(cancellationToken);
    }

    private async Task EnsureDefaultChannelsAsync(Guid actorUserId, Guid organizationId, CancellationToken cancellationToken)
    {
        var existingChannels = await channelRepository.GetAllAsync(organizationId, true, cancellationToken);
        var existingOrganizationChannelNames = new HashSet<string>(
            existingChannels.Where(x => !x.ProjectId.HasValue).Select(x => x.Name),
            StringComparer.OrdinalIgnoreCase);
        var existingProjectIds = existingChannels.Where(x => x.ProjectId.HasValue).Select(x => x.ProjectId!.Value).ToHashSet();

        var organizationUserIds = await dbContext.Users
            .Where(x => x.OrganizationId == organizationId && x.IsActive)
            .Select(x => x.Id)
            .ToListAsync(cancellationToken);

        async Task EnsureOrganizationChannelAsync(string name, string description)
        {
            if (existingOrganizationChannelNames.Contains(name))
            {
                return;
            }

            var channel = new Channel
            {
                Id = Guid.NewGuid(),
                Name = name,
                Description = description,
                Type = ChannelType.General,
                OrganizationId = organizationId,
                CreatedByUserId = actorUserId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };

            await channelRepository.AddAsync(channel, cancellationToken);
            foreach (var userId in organizationUserIds)
            {
                await channelRepository.AddMemberAsync(new ChannelMember
                {
                    Id = Guid.NewGuid(),
                    ChannelId = channel.Id,
                    UserId = userId,
                    Role = userId == actorUserId ? ChannelMemberRole.Owner : ChannelMemberRole.Member,
                    JoinedAt = DateTime.UtcNow,
                    LastReadAt = userId == actorUserId ? DateTime.UtcNow : null,
                }, cancellationToken);
            }
        }

        await EnsureOrganizationChannelAsync("General Updates", "Organization-wide notices, milestones, and research operations updates.");
        await EnsureOrganizationChannelAsync("Documentation Reviews", "Coordinate document approvals, version requests, and archival actions.");

        var projects = await dbContext.Projects
            .Include(x => x.Members)
            .Where(x => x.OrganizationId == organizationId)
            .ToListAsync(cancellationToken);

        foreach (var project in projects)
        {
            if (existingProjectIds.Contains(project.Id))
            {
                continue;
            }

            var channel = new Channel
            {
                Id = Guid.NewGuid(),
                Name = project.Title,
                Description = $"Project collaboration space for {project.Title}.",
                Type = ChannelType.ProjectChannel,
                ProjectId = project.Id,
                OrganizationId = organizationId,
                CreatedByUserId = project.CreatedByUserId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };

            await channelRepository.AddAsync(channel, cancellationToken);

            var memberIds = project.Members.Select(x => x.UserId)
                .Append(project.CreatedByUserId)
                .Distinct()
                .ToList();

            foreach (var memberId in memberIds)
            {
                await channelRepository.AddMemberAsync(new ChannelMember
                {
                    Id = Guid.NewGuid(),
                    ChannelId = channel.Id,
                    UserId = memberId,
                    Role = memberId == project.CreatedByUserId ? ChannelMemberRole.Owner : ChannelMemberRole.Member,
                    JoinedAt = DateTime.UtcNow,
                }, cancellationToken);
            }
        }

        await channelRepository.SaveChangesAsync(cancellationToken);
    }

    private async Task<Guid?> ResolveActorOrganizationIdAsync(Guid actorUserId, CancellationToken cancellationToken)
    {
        return await dbContext.Users
            .Where(x => x.Id == actorUserId)
            .Select(x => x.OrganizationId)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private async Task<Guid> ResolveTargetOrganizationIdAsync(Guid actorUserId, string actorRole, Guid? requestedOrganizationId, CancellationToken cancellationToken)
    {
        if (CollaborationAuthorizationHelper.IsSuperAdmin(actorRole))
        {
            if (!requestedOrganizationId.HasValue)
            {
                throw new InvalidOperationException("OrganizationId is required for SuperAdmin channel actions");
            }

            return requestedOrganizationId.Value;
        }

        return await ResolveActorOrganizationIdAsync(actorUserId, cancellationToken)
            ?? throw new UnauthorizedAccessException("User must belong to an organization to manage collaboration channels");
    }

    private async Task<List<Guid>> GetValidOrganizationUserIdsAsync(Guid organizationId, IReadOnlyCollection<Guid> candidateIds, CancellationToken cancellationToken)
    {
        return await dbContext.Users
            .Where(x => x.OrganizationId == organizationId && x.IsActive && candidateIds.Contains(x.Id))
            .Select(x => x.Id)
            .ToListAsync(cancellationToken);
    }

    private bool CanAccessChannel(Channel channel, Guid actorUserId, string actorRole)
    {
        return CollaborationAuthorizationHelper.IsOrganizationAdmin(actorRole)
            || CollaborationAuthorizationHelper.IsSuperAdmin(actorRole)
            || channel.Members.Any(member => member.UserId == actorUserId);
    }

    private async Task EnsureChannelAccessAsync(Channel channel, Guid actorUserId, string actorRole, CancellationToken cancellationToken)
    {
        if (CollaborationAuthorizationHelper.IsSuperAdmin(actorRole))
        {
            return;
        }

        var organizationId = await ResolveActorOrganizationIdAsync(actorUserId, cancellationToken);
        if (!organizationId.HasValue || organizationId.Value != channel.OrganizationId)
        {
            throw new UnauthorizedAccessException("You are not allowed to access this collaboration channel");
        }

        if (!CollaborationAuthorizationHelper.IsOrganizationAdmin(actorRole) && channel.Members.All(x => x.UserId != actorUserId))
        {
            throw new UnauthorizedAccessException("You must be a member of this collaboration channel");
        }
    }

    private async Task EnsureChannelOwnerOrOrgAdminAsync(Channel channel, Guid actorUserId, string actorRole, CancellationToken cancellationToken)
    {
        await EnsureChannelAccessAsync(channel, actorUserId, actorRole, cancellationToken);

        if (CollaborationAuthorizationHelper.IsOrganizationAdmin(actorRole) || CollaborationAuthorizationHelper.IsSuperAdmin(actorRole))
        {
            return;
        }

        var member = channel.Members.FirstOrDefault(x => x.UserId == actorUserId);
        if (member?.Role != ChannelMemberRole.Owner)
        {
            throw new UnauthorizedAccessException("Only channel owners can update or archive this channel");
        }
    }

    private async Task EnsureChannelModeratorAsync(Channel channel, Guid actorUserId, string actorRole, CancellationToken cancellationToken)
    {
        await EnsureChannelAccessAsync(channel, actorUserId, actorRole, cancellationToken);

        if (CollaborationAuthorizationHelper.IsOrganizationAdmin(actorRole) || CollaborationAuthorizationHelper.IsSuperAdmin(actorRole))
        {
            return;
        }

        var member = channel.Members.FirstOrDefault(x => x.UserId == actorUserId);
        if (member?.Role is not (ChannelMemberRole.Owner or ChannelMemberRole.Moderator))
        {
            throw new UnauthorizedAccessException("Only channel moderators can manage members");
        }
    }

    private async Task EnsureProjectAccessAsync(Project project, Guid actorUserId, string actorRole, CancellationToken cancellationToken)
    {
        if (CollaborationAuthorizationHelper.IsSuperAdmin(actorRole))
        {
            return;
        }

        var organizationId = await ResolveActorOrganizationIdAsync(actorUserId, cancellationToken);
        if (!organizationId.HasValue || organizationId.Value != project.OrganizationId)
        {
            throw new UnauthorizedAccessException("You are not allowed to access this project channel list");
        }

        if (CollaborationAuthorizationHelper.IsOrganizationAdmin(actorRole))
        {
            return;
        }

        var isMember = await dbContext.ProjectMembers.AnyAsync(
            x => x.ProjectId == project.Id && x.UserId == actorUserId,
            cancellationToken);

        if (!isMember && project.CreatedByUserId != actorUserId)
        {
            throw new UnauthorizedAccessException("You must be a project member to access project channels");
        }
    }

    private async Task NotifyChannelUpdatedAsync(Channel channel, Guid actorUserId, CancellationToken cancellationToken)
    {
        var refreshed = await channelRepository.GetByIdAsync(channel.Id, true, true, cancellationToken);
        if (refreshed is null)
        {
            return;
        }

        var dto = CollaborationMapper.MapChannel(refreshed, actorUserId);
        await hubContext.Clients.Group(CollaborationHub.ChannelGroup(channel.Id))
            .SendAsync("ChannelUpdated", dto, cancellationToken);

        await hubContext.Clients.Groups(refreshed.Members.Select(x => CollaborationHub.UserGroup(x.UserId)).ToList())
            .SendAsync("ChannelUpdated", dto, cancellationToken);
    }
}