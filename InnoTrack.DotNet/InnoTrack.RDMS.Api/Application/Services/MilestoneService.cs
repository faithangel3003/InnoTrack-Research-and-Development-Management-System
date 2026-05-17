using InnoTrack.RDMS.Api.Application.Dtos.Milestones;
using InnoTrack.RDMS.Api.Application.Interfaces.Repositories;
using InnoTrack.RDMS.Api.Application.Interfaces.Services;
using InnoTrack.RDMS.Api.Domain.Entities;
using InnoTrack.RDMS.Api.Domain.Enums;
using InnoTrack.RDMS.Api.Infrastructure.Data;

namespace InnoTrack.RDMS.Api.Application.Services;

public class MilestoneService(
    IMilestoneRepository milestoneRepository,
    IProjectRepository projectRepository,
    IAuditLogService auditLogService,
    INotificationService notificationService,
    AppDbContext dbContext) : IMilestoneService
{
    public async Task<List<MilestoneDto>> GetMilestonesByProjectAsync(Guid projectId, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default)
    {
        await EnsureCanReadProject(projectId, actorUserId, actorRole, cancellationToken);
        var milestones = await milestoneRepository.GetByProjectAsync(projectId, cancellationToken);
        return milestones.Select(Map).ToList();
    }

    public async Task<MilestoneDto> CreateMilestoneAsync(Guid projectId, CreateMilestoneDto request, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default)
    {
        await EnsureCanManageProject(projectId, actorUserId, actorRole, cancellationToken);
        var project = await projectRepository.GetByIdAsync(projectId, cancellationToken)
                      ?? throw new InvalidOperationException("Project not found");

        var milestone = new Milestone
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            Title = request.Title.Trim(),
            Description = request.Description?.Trim(),
            DueDate = request.DueDate,
            IsCompleted = false,
            CreatedAt = DateTime.UtcNow
        };

        await milestoneRepository.AddAsync(milestone, cancellationToken);
        await milestoneRepository.SaveChangesAsync(cancellationToken);
        await auditLogService.LogActionAsync(actorUserId, actorUserId, null, "milestone.create", "milestones", milestone.Id, "info", ipAddress, cancellationToken);
        await NotifyMilestoneActivityAsync(
            milestone,
            project,
            actorUserId,
            "Milestone created",
            $"{await CrossModuleNotificationHelper.ResolveUserDisplayNameAsync(dbContext, actorUserId, cancellationToken)} created milestone \"{milestone.Title}\" in project \"{project.Title}\".",
            cancellationToken);

        return Map(milestone);
    }

    public async Task<MilestoneDto?> CompleteMilestoneAsync(Guid id, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var milestone = await milestoneRepository.GetByIdAsync(id, cancellationToken);
        if (milestone is null)
        {
            return null;
        }

        await EnsureCanManageProject(milestone.ProjectId, actorUserId, actorRole, cancellationToken);
        var project = await projectRepository.GetByIdAsync(milestone.ProjectId, cancellationToken)
                      ?? throw new InvalidOperationException("Project not found");

        milestone.IsCompleted = true;
        milestone.CompletedAt = DateTime.UtcNow;
        milestoneRepository.Update(milestone);
        await milestoneRepository.SaveChangesAsync(cancellationToken);

        await auditLogService.LogActionAsync(actorUserId, actorUserId, null, "milestone.complete", "milestones", milestone.Id, "info", ipAddress, cancellationToken);
        await NotifyMilestoneActivityAsync(
            milestone,
            project,
            actorUserId,
            "Milestone completed",
            $"{await CrossModuleNotificationHelper.ResolveUserDisplayNameAsync(dbContext, actorUserId, cancellationToken)} completed milestone \"{milestone.Title}\" in project \"{project.Title}\".",
            cancellationToken);
        return Map(milestone);
    }

    public async Task<bool> DeleteMilestoneAsync(Guid id, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var milestone = await milestoneRepository.GetByIdAsync(id, cancellationToken);
        if (milestone is null)
        {
            return false;
        }

        await EnsureCanManageProject(milestone.ProjectId, actorUserId, actorRole, cancellationToken);
        var project = await projectRepository.GetByIdAsync(milestone.ProjectId, cancellationToken)
                      ?? throw new InvalidOperationException("Project not found");

        var notificationMessage = $"{await CrossModuleNotificationHelper.ResolveUserDisplayNameAsync(dbContext, actorUserId, cancellationToken)} removed milestone \"{milestone.Title}\" from project \"{project.Title}\".";
        var recipientIds = await CrossModuleNotificationHelper.GetProjectStakeholderUserIdsAsync(dbContext, project, actorUserId, cancellationToken);

        milestoneRepository.Remove(milestone);
        await milestoneRepository.SaveChangesAsync(cancellationToken);

        await auditLogService.LogActionAsync(actorUserId, actorUserId, null, "milestone.delete", "milestones", milestone.Id, "warning", ipAddress, cancellationToken);
        await notificationService.CreateNotificationsAsync(recipientIds, actorUserId, NotificationType.MilestoneReached, "Milestone removed", notificationMessage, milestone.Id, "milestone", cancellationToken);
        return true;
    }

    private async Task NotifyMilestoneActivityAsync(Milestone milestone, Project project, Guid actorUserId, string title, string message, CancellationToken cancellationToken)
    {
        var recipientIds = await CrossModuleNotificationHelper.GetProjectStakeholderUserIdsAsync(dbContext, project, actorUserId, cancellationToken);
        await notificationService.CreateNotificationsAsync(recipientIds, actorUserId, NotificationType.MilestoneReached, title, message, milestone.Id, "milestone", cancellationToken);
    }

    private async Task EnsureCanReadProject(Guid projectId, Guid actorUserId, string actorRole, CancellationToken cancellationToken)
    {
        var normalizedRole = NormalizeRole(actorRole);
        if (normalizedRole is "superadmin" or "systemadmin")
        {
            return;
        }

        var project = await projectRepository.GetByIdAsync(projectId, cancellationToken)
                      ?? throw new InvalidOperationException("Project not found");

        if (normalizedRole == "projectmanager" && project.CreatedByUserId != actorUserId)
        {
            throw new UnauthorizedAccessException("ProjectManager can only access own projects");
        }
    }

    private async Task EnsureCanManageProject(Guid projectId, Guid actorUserId, string actorRole, CancellationToken cancellationToken)
    {
        if (NormalizeRole(actorRole) != "projectmanager")
        {
            throw new UnauthorizedAccessException("ProjectManager role required");
        }

        var project = await projectRepository.GetByIdAsync(projectId, cancellationToken)
                      ?? throw new InvalidOperationException("Project not found");
        if (project.CreatedByUserId != actorUserId)
        {
            throw new UnauthorizedAccessException("ProjectManager can only manage own projects");
        }
    }

    private static MilestoneDto Map(Milestone milestone)
    {
        return new MilestoneDto
        {
            Id = milestone.Id,
            ProjectId = milestone.ProjectId,
            Title = milestone.Title,
            Description = milestone.Description,
            DueDate = milestone.DueDate,
            IsCompleted = milestone.IsCompleted,
            CompletedAt = milestone.CompletedAt,
            CreatedAt = milestone.CreatedAt
        };
    }

    private static string NormalizeRole(string role)
    {
        return role.Replace(" ", string.Empty).Trim().ToLowerInvariant();
    }
}
