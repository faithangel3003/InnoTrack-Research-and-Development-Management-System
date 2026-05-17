using InnoTrack.RDMS.Api.Application.Dtos.Collaboration;
using InnoTrack.RDMS.Api.Application.Interfaces.Repositories;
using InnoTrack.RDMS.Api.Application.Interfaces.Services;
using InnoTrack.RDMS.Api.Domain.Entities;
using InnoTrack.RDMS.Api.Domain.Enums;
using InnoTrack.RDMS.Api.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace InnoTrack.RDMS.Api.Application.Services;

public class AnnouncementService(
    IAnnouncementRepository announcementRepository,
    INotificationService notificationService,
    IAuditLogService auditLogService,
    AppDbContext dbContext) : IAnnouncementService
{
    public async Task<List<AnnouncementDto>> GetAnnouncementsAsync(Guid actorUserId, string actorRole, CancellationToken cancellationToken = default)
    {
        var organizationId = await ResolveActorOrganizationIdAsync(actorUserId, cancellationToken);
        if (!organizationId.HasValue)
        {
            return new List<AnnouncementDto>();
        }

        var accessibleProjectIds = await ResolveAccessibleProjectIdsAsync(actorUserId, actorRole, organizationId.Value, cancellationToken);
        var announcements = await announcementRepository.GetByOrganizationAsync(organizationId.Value, cancellationToken);
        var now = DateTime.UtcNow;

        return announcements
            .Where(x => !x.ExpiresAt.HasValue || x.ExpiresAt > now)
            .Where(x => x.IsPublished || x.PostedByUserId == actorUserId || CollaborationAuthorizationHelper.IsOrganizationAdmin(actorRole))
            .Where(x => !x.ProjectId.HasValue || accessibleProjectIds.Contains(x.ProjectId.Value) || CollaborationAuthorizationHelper.IsOrganizationAdmin(actorRole) || CollaborationAuthorizationHelper.IsSuperAdmin(actorRole))
            .Select(CollaborationMapper.MapAnnouncement)
            .ToList();
    }

    public async Task<AnnouncementDto?> GetAnnouncementByIdAsync(Guid id, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default)
    {
        var announcement = await announcementRepository.GetByIdAsync(id, true, cancellationToken);
        if (announcement is null)
        {
            return null;
        }

        await EnsureAnnouncementAccessAsync(announcement, actorUserId, actorRole, cancellationToken);
        return CollaborationMapper.MapAnnouncement(announcement);
    }

    public async Task<AnnouncementDto> CreateAnnouncementAsync(CreateAnnouncementDto request, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default)
    {
        if (!CollaborationAuthorizationHelper.CanPostAnnouncements(actorRole))
        {
            throw new UnauthorizedAccessException("You do not have permission to create announcements");
        }

        var organizationId = await ResolveTargetOrganizationIdAsync(actorUserId, actorRole, request.OrganizationId, cancellationToken);
        await ValidateProjectAsync(request.ProjectId, organizationId, cancellationToken);

        var announcement = new Announcement
        {
            Id = Guid.NewGuid(),
            Title = request.Title.Trim(),
            Content = request.Content.Trim(),
            PostedByUserId = actorUserId,
            OrganizationId = organizationId,
            ProjectId = request.ProjectId,
            Priority = request.Priority,
            IsPublished = request.PublishImmediately,
            PublishedAt = request.PublishImmediately ? DateTime.UtcNow : null,
            ExpiresAt = request.ExpiresAt,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        await announcementRepository.AddAsync(announcement, cancellationToken);
        await announcementRepository.SaveChangesAsync(cancellationToken);
        await auditLogService.LogActionAsync(actorUserId, actorUserId, organizationId, "collaboration.announcement.create", "announcements", announcement.Id, "info", ipAddress, cancellationToken);

        var created = await announcementRepository.GetByIdAsync(announcement.Id, true, cancellationToken)
            ?? throw new InvalidOperationException("Announcement could not be loaded after creation");

        if (created.IsPublished)
        {
            await DispatchAnnouncementNotificationsAsync(created, actorUserId, cancellationToken);
        }

        return CollaborationMapper.MapAnnouncement(created);
    }

    public async Task<AnnouncementDto?> UpdateAnnouncementAsync(Guid id, UpdateAnnouncementDto request, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var announcement = await announcementRepository.GetByIdAsync(id, true, cancellationToken);
        if (announcement is null)
        {
            return null;
        }

        await EnsureAnnouncementManagePermissionAsync(announcement, actorUserId, actorRole, cancellationToken);
        await ValidateProjectAsync(request.ProjectId, announcement.OrganizationId, cancellationToken);

        announcement.Title = request.Title.Trim();
        announcement.Content = request.Content.Trim();
        announcement.ProjectId = request.ProjectId;
        announcement.Priority = request.Priority;
        announcement.IsPublished = request.IsPublished;
        announcement.PublishedAt = request.IsPublished ? announcement.PublishedAt ?? DateTime.UtcNow : null;
        announcement.ExpiresAt = request.ExpiresAt;
        announcement.UpdatedAt = DateTime.UtcNow;

        announcementRepository.Update(announcement);
        await announcementRepository.SaveChangesAsync(cancellationToken);
        await auditLogService.LogActionAsync(actorUserId, actorUserId, announcement.OrganizationId, "collaboration.announcement.update", "announcements", announcement.Id, "info", ipAddress, cancellationToken);

        var updated = await announcementRepository.GetByIdAsync(id, true, cancellationToken)
            ?? throw new InvalidOperationException("Announcement could not be reloaded");

        return CollaborationMapper.MapAnnouncement(updated);
    }

    public async Task<AnnouncementDto?> PublishAnnouncementAsync(Guid id, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var announcement = await announcementRepository.GetByIdAsync(id, true, cancellationToken);
        if (announcement is null)
        {
            return null;
        }

        await EnsureAnnouncementManagePermissionAsync(announcement, actorUserId, actorRole, cancellationToken);

        if (!announcement.IsPublished)
        {
            announcement.IsPublished = true;
            announcement.PublishedAt = DateTime.UtcNow;
            announcement.UpdatedAt = DateTime.UtcNow;
            announcementRepository.Update(announcement);
            await announcementRepository.SaveChangesAsync(cancellationToken);
            await DispatchAnnouncementNotificationsAsync(announcement, actorUserId, cancellationToken);
        }

        await auditLogService.LogActionAsync(actorUserId, actorUserId, announcement.OrganizationId, "collaboration.announcement.publish", "announcements", announcement.Id, "info", ipAddress, cancellationToken);
        return CollaborationMapper.MapAnnouncement(announcement);
    }

    public async Task<bool> DeleteAnnouncementAsync(Guid id, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var announcement = await announcementRepository.GetByIdAsync(id, true, cancellationToken);
        if (announcement is null)
        {
            return false;
        }

        await EnsureAnnouncementManagePermissionAsync(announcement, actorUserId, actorRole, cancellationToken);
        announcementRepository.Remove(announcement);
        await announcementRepository.SaveChangesAsync(cancellationToken);
        await auditLogService.LogActionAsync(actorUserId, actorUserId, announcement.OrganizationId, "collaboration.announcement.delete", "announcements", announcement.Id, "warning", ipAddress, cancellationToken);
        return true;
    }

    public async Task MarkAsReadAsync(Guid id, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default)
    {
        var announcement = await announcementRepository.GetByIdAsync(id, true, cancellationToken)
            ?? throw new InvalidOperationException("Announcement not found");

        await EnsureAnnouncementAccessAsync(announcement, actorUserId, actorRole, cancellationToken);
        var receipt = await announcementRepository.GetReadReceiptAsync(id, actorUserId, cancellationToken);
        if (receipt is not null)
        {
            return;
        }

        await announcementRepository.AddReadReceiptAsync(new AnnouncementReadReceipt
        {
            Id = Guid.NewGuid(),
            AnnouncementId = id,
            UserId = actorUserId,
            ReadAt = DateTime.UtcNow,
        }, cancellationToken);
        await announcementRepository.SaveChangesAsync(cancellationToken);
    }

    public async Task<int> GetUnreadCountAsync(Guid actorUserId, string actorRole, CancellationToken cancellationToken = default)
    {
        var organizationId = await ResolveActorOrganizationIdAsync(actorUserId, cancellationToken);
        if (!organizationId.HasValue)
        {
            return 0;
        }

        var accessibleProjectIds = await ResolveAccessibleProjectIdsAsync(actorUserId, actorRole, organizationId.Value, cancellationToken);
        return await announcementRepository.GetUnreadCountAsync(organizationId.Value, actorUserId, accessibleProjectIds, cancellationToken);
    }

    private async Task DispatchAnnouncementNotificationsAsync(Announcement announcement, Guid actorUserId, CancellationToken cancellationToken)
    {
        var recipientIds = await ResolveAnnouncementRecipientUserIdsAsync(announcement, cancellationToken);
        foreach (var userId in recipientIds.Where(x => x != actorUserId))
        {
            await notificationService.CreateNotificationAsync(
                userId,
                NotificationType.AnnouncementPosted,
                announcement.Title,
                announcement.Content.Length > 180 ? $"{announcement.Content[..177]}..." : announcement.Content,
                announcement.Id,
                "Announcement",
                cancellationToken);
        }
    }

    private async Task<List<Guid>> ResolveAnnouncementRecipientUserIdsAsync(Announcement announcement, CancellationToken cancellationToken)
    {
        if (announcement.ProjectId.HasValue)
        {
            var projectMemberIds = await dbContext.ProjectMembers
                .Where(x => x.ProjectId == announcement.ProjectId.Value)
                .Select(x => x.UserId)
                .Distinct()
                .ToListAsync(cancellationToken);

            var project = await dbContext.Projects.FirstOrDefaultAsync(x => x.Id == announcement.ProjectId.Value, cancellationToken);
            if (project is not null && !projectMemberIds.Contains(project.CreatedByUserId))
            {
                projectMemberIds.Add(project.CreatedByUserId);
            }

            return projectMemberIds;
        }

        return await dbContext.Users
            .Where(x => x.OrganizationId == announcement.OrganizationId && x.IsActive)
            .Select(x => x.Id)
            .ToListAsync(cancellationToken);
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
                throw new InvalidOperationException("OrganizationId is required for SuperAdmin announcement actions");
            }

            return requestedOrganizationId.Value;
        }

        return await ResolveActorOrganizationIdAsync(actorUserId, cancellationToken)
            ?? throw new UnauthorizedAccessException("User must belong to an organization to manage announcements");
    }

    private async Task<IReadOnlyCollection<Guid>> ResolveAccessibleProjectIdsAsync(Guid actorUserId, string actorRole, Guid organizationId, CancellationToken cancellationToken)
    {
        if (CollaborationAuthorizationHelper.IsOrganizationAdmin(actorRole) || CollaborationAuthorizationHelper.IsSuperAdmin(actorRole))
        {
            return await dbContext.Projects
                .Where(x => x.OrganizationId == organizationId)
                .Select(x => x.Id)
                .ToListAsync(cancellationToken);
        }

        return await dbContext.ProjectMembers
            .Where(x => x.UserId == actorUserId && x.Project.OrganizationId == organizationId)
            .Select(x => x.ProjectId)
            .Distinct()
            .ToListAsync(cancellationToken);
    }

    private async Task EnsureAnnouncementAccessAsync(Announcement announcement, Guid actorUserId, string actorRole, CancellationToken cancellationToken)
    {
        if (CollaborationAuthorizationHelper.IsSuperAdmin(actorRole))
        {
            return;
        }

        var organizationId = await ResolveActorOrganizationIdAsync(actorUserId, cancellationToken);
        if (!organizationId.HasValue || organizationId.Value != announcement.OrganizationId)
        {
            throw new UnauthorizedAccessException("You are not allowed to access this announcement");
        }

        if (!announcement.ProjectId.HasValue || CollaborationAuthorizationHelper.IsOrganizationAdmin(actorRole))
        {
            return;
        }

        var hasProjectAccess = await dbContext.ProjectMembers.AnyAsync(
            x => x.ProjectId == announcement.ProjectId.Value && x.UserId == actorUserId,
            cancellationToken);

        if (!hasProjectAccess)
        {
            throw new UnauthorizedAccessException("You do not have access to this project announcement");
        }
    }

    private async Task EnsureAnnouncementManagePermissionAsync(Announcement announcement, Guid actorUserId, string actorRole, CancellationToken cancellationToken)
    {
        await EnsureAnnouncementAccessAsync(announcement, actorUserId, actorRole, cancellationToken);
        if (announcement.PostedByUserId != actorUserId
            && !CollaborationAuthorizationHelper.IsOrganizationAdmin(actorRole)
            && !CollaborationAuthorizationHelper.IsSuperAdmin(actorRole))
        {
            throw new UnauthorizedAccessException("Only the creator or an administrator can manage this announcement");
        }
    }

    private async Task ValidateProjectAsync(Guid? projectId, Guid organizationId, CancellationToken cancellationToken)
    {
        if (!projectId.HasValue)
        {
            return;
        }

        var exists = await dbContext.Projects.AnyAsync(
            x => x.Id == projectId.Value && x.OrganizationId == organizationId,
            cancellationToken);

        if (!exists)
        {
            throw new InvalidOperationException("Selected project is not valid for this organization");
        }
    }
}