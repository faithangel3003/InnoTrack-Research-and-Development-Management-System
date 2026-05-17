using InnoTrack.RDMS.Api.Application.Dtos.Projects;
using InnoTrack.RDMS.Api.Application.Interfaces.Repositories;
using InnoTrack.RDMS.Api.Application.Interfaces.Services;
using InnoTrack.RDMS.Api.Domain.Entities;
using InnoTrack.RDMS.Api.Domain.Enums;
using InnoTrack.RDMS.Api.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace InnoTrack.RDMS.Api.Application.Services;

public class ProjectService(
    IProjectRepository projectRepository,
    IProjectMemberRepository projectMemberRepository,
    ITaskRepository taskRepository,
    IAuditLogService auditLogService,
    INotificationService notificationService,
    AppDbContext dbContext) : IProjectService
{
    public async Task<List<ProjectDto>> GetAllProjectsAsync(Guid actorUserId, string actorRole, CancellationToken cancellationToken = default)
    {
        var normalizedRole = NormalizeRole(actorRole);
        Guid? actorOrganizationId = null;

        if (normalizedRole == "systemadmin")
        {
            actorOrganizationId = await dbContext.Users
                .Where(x => x.Id == actorUserId)
                .Select(x => x.OrganizationId)
                .FirstOrDefaultAsync(cancellationToken);
        }

        List<Project> projects = normalizedRole switch
        {
            "superadmin" => await projectRepository.GetAllAsync(cancellationToken),
            "systemadmin" when actorOrganizationId.HasValue => await projectRepository.GetByOrganizationAsync(actorOrganizationId.Value, cancellationToken),
            "systemadmin" => new List<Project>(),
            "projectmanager" => await projectRepository.GetByUserAsync(actorUserId, cancellationToken),
            "teammember" => await projectRepository.GetByUserAsync(actorUserId, cancellationToken),
            _ => new List<Project>()
        };

        return projects.Select(MapProject).ToList();
    }

    public async Task<ProjectDto?> GetProjectByIdAsync(Guid id, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default)
    {
        var project = await projectRepository.GetByIdAsync(id, cancellationToken);
        if (project is null)
        {
            return null;
        }

        var canAccess = await CanAccessProjectAsync(project, actorUserId, actorRole, cancellationToken);
        if (!canAccess)
        {
            throw new UnauthorizedAccessException("You are not allowed to access this project");
        }

        return MapProject(project);
    }

    public async Task<ProjectDto> CreateProjectAsync(CreateProjectDto request, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var organizationId = await ResolveProjectOrganizationIdAsync(request.OrganizationId, actorUserId, actorRole, cancellationToken);

        if (request.EndDate <= request.StartDate)
        {
            throw new InvalidOperationException("EndDate must be after StartDate");
        }

        var project = new Project
        {
            Id = Guid.NewGuid(),
            Title = request.Title.Trim(),
            Description = request.Description?.Trim(),
            Priority = ParseProjectPriority(request.Priority),
            Status = ProjectStatus.Draft,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            CreatedByUserId = actorUserId,
            OrganizationId = organizationId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        project.Members.Add(new ProjectMember
        {
            Id = Guid.NewGuid(),
            ProjectId = project.Id,
            UserId = actorUserId,
            MemberRole = MemberRole.Lead,
            JoinedAt = DateTime.UtcNow
        });

        await projectRepository.AddAsync(project, cancellationToken);
        await projectRepository.SaveChangesAsync(cancellationToken);

        await auditLogService.LogActionAsync(project.CreatedByUserId, actorUserId, project.OrganizationId, "project.create", "projects", project.Id, "info", ipAddress, cancellationToken);
        await NotifyProjectActivityAsync(project, actorUserId, "Project created", $"{await CrossModuleNotificationHelper.ResolveUserDisplayNameAsync(dbContext, actorUserId, cancellationToken)} created project \"{project.Title}\".", cancellationToken);

        return MapProject(project);
    }

    public async Task<ProjectDto?> UpdateProjectAsync(Guid id, UpdateProjectDto request, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default)
    {
        if (request.EndDate <= request.StartDate)
        {
            throw new InvalidOperationException("EndDate must be after StartDate");
        }

        var project = await projectRepository.GetByIdAsync(id, cancellationToken);
        if (project is null)
        {
            return null;
        }

        await EnsureCanManageProjectAsync(project, actorUserId, actorRole, cancellationToken);

        project.Title = request.Title.Trim();
        project.Description = request.Description?.Trim();
        project.Priority = ParseProjectPriority(request.Priority);
        project.StartDate = request.StartDate;
        project.EndDate = request.EndDate;
        project.UpdatedAt = DateTime.UtcNow;

        projectRepository.Update(project);
        await projectRepository.SaveChangesAsync(cancellationToken);

        await auditLogService.LogActionAsync(project.CreatedByUserId, actorUserId, project.OrganizationId, "project.update", "projects", project.Id, "info", ipAddress, cancellationToken);
        await NotifyProjectActivityAsync(project, actorUserId, "Project updated", $"{await CrossModuleNotificationHelper.ResolveUserDisplayNameAsync(dbContext, actorUserId, cancellationToken)} updated project \"{project.Title}\".", cancellationToken);

        return MapProject(project);
    }

    public async Task<bool> DeleteProjectAsync(Guid id, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var project = await projectRepository.GetByIdAsync(id, cancellationToken);
        if (project is null)
        {
            return false;
        }

        var normalizedRole = NormalizeRole(actorRole);
        if (normalizedRole == "superadmin")
        {
            // Super Admin can remove platform-level test data from the portal.
        }
        else if (normalizedRole is "systemadmin" or "projectmanager")
        {
            await EnsureCanManageProjectAsync(project, actorUserId, actorRole, cancellationToken);
        }
        else
        {
            throw new UnauthorizedAccessException("You are not allowed to delete this project");
        }

        if (project.Status == ProjectStatus.Active)
        {
            throw new InvalidOperationException("Cannot delete active project. Set status to Cancelled first.");
        }

        var notificationMessage = $"{await CrossModuleNotificationHelper.ResolveUserDisplayNameAsync(dbContext, actorUserId, cancellationToken)} removed project \"{project.Title}\".";
        var recipientIds = await CrossModuleNotificationHelper.GetProjectStakeholderUserIdsAsync(dbContext, project, actorUserId, cancellationToken);

        projectRepository.Remove(project);
        await projectRepository.SaveChangesAsync(cancellationToken);

        await auditLogService.LogActionAsync(project.CreatedByUserId, actorUserId, project.OrganizationId, "project.delete", "projects", project.Id, "warning", ipAddress, cancellationToken);
        await notificationService.CreateNotificationsAsync(recipientIds, actorUserId, NotificationType.ProjectUpdated, "Project removed", notificationMessage, project.Id, "project", cancellationToken);

        return true;
    }

    public async Task<ProjectDto?> ChangeProjectStatusAsync(Guid id, ChangeProjectStatusDto request, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var project = await projectRepository.GetByIdAsync(id, cancellationToken);
        if (project is null)
        {
            return null;
        }

        await EnsureCanManageProjectAsync(project, actorUserId, actorRole, cancellationToken);

        var oldStatus = project.Status;
        var newStatus = ParseProjectStatus(request.Status);
        project.Status = newStatus;
        project.UpdatedAt = DateTime.UtcNow;

        dbContext.ProjectStatusHistory.Add(new ProjectStatusHistory
        {
            Id = Guid.NewGuid(),
            ProjectId = project.Id,
            ChangedByUserId = actorUserId,
            OldStatus = oldStatus.ToString(),
            NewStatus = newStatus.ToString(),
            ChangedAt = DateTime.UtcNow,
            Remarks = request.Remarks
        });

        await projectRepository.SaveChangesAsync(cancellationToken);

        await auditLogService.LogActionAsync(project.CreatedByUserId, actorUserId, project.OrganizationId, "project.status.change", "projects", project.Id, "info", ipAddress, cancellationToken);
        await NotifyProjectActivityAsync(project, actorUserId, "Project status changed", $"{await CrossModuleNotificationHelper.ResolveUserDisplayNameAsync(dbContext, actorUserId, cancellationToken)} changed project \"{project.Title}\" from {oldStatus} to {newStatus}.", cancellationToken);

        return MapProject(project);
    }

    private async Task NotifyProjectActivityAsync(Project project, Guid actorUserId, string title, string message, CancellationToken cancellationToken)
    {
        var recipientIds = await CrossModuleNotificationHelper.GetProjectStakeholderUserIdsAsync(dbContext, project, actorUserId, cancellationToken);
        await notificationService.CreateNotificationsAsync(recipientIds, actorUserId, NotificationType.ProjectUpdated, title, message, project.Id, "project", cancellationToken);
    }

    public async Task<ProjectSummaryDto?> GetProjectSummaryAsync(Guid id, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default)
    {
        var project = await projectRepository.GetByIdAsync(id, cancellationToken);
        if (project is null)
        {
            return null;
        }

        var canAccess = await CanAccessProjectAsync(project, actorUserId, actorRole, cancellationToken);
        if (!canAccess)
        {
            throw new UnauthorizedAccessException("You are not allowed to access this project");
        }

        var tasks = await taskRepository.GetByProjectAsync(id, cancellationToken);
        var members = await projectMemberRepository.GetByProjectAsync(id, cancellationToken);

        var completed = tasks.Count(x => x.Status == Domain.Enums.TaskStatus.Done);
        var overdue = tasks.Count(x => x.Status != Domain.Enums.TaskStatus.Done && x.DueDate < DateTime.UtcNow);

        return new ProjectSummaryDto
        {
            ProjectId = id,
            TotalTasks = tasks.Count,
            CompletedTasks = completed,
            OverdueTasks = overdue,
            MemberCount = members.Count,
            CompletionRate = tasks.Count == 0 ? 0 : Math.Round((double)completed / tasks.Count * 100, 2)
        };
    }

    private async Task<bool> CanAccessProjectAsync(Project project, Guid actorUserId, string actorRole, CancellationToken cancellationToken)
    {
        var normalized = NormalizeRole(actorRole);
        if (normalized == "superadmin")
        {
            return true;
        }

        if (normalized == "systemadmin")
        {
            var actorOrganizationId = await dbContext.Users
                .Where(x => x.Id == actorUserId)
                .Select(x => x.OrganizationId)
                .FirstOrDefaultAsync(cancellationToken);

            return actorOrganizationId.HasValue && actorOrganizationId.Value == project.OrganizationId;
        }

        if (normalized == "projectmanager")
        {
            return project.CreatedByUserId == actorUserId;
        }

        if (normalized == "teammember")
        {
            return await dbContext.ProjectMembers.AnyAsync(x => x.ProjectId == project.Id && x.UserId == actorUserId, cancellationToken)
                   || await dbContext.ProjectTasks.AnyAsync(x => x.ProjectId == project.Id && x.AssignedToUserId == actorUserId, cancellationToken);
        }

        return false;
    }

    private async Task<Guid> ResolveProjectOrganizationIdAsync(Guid requestedOrganizationId, Guid actorUserId, string actorRole, CancellationToken cancellationToken)
    {
        var normalizedRole = NormalizeRole(actorRole);
        if (normalizedRole == "projectmanager")
        {
            var actorOrganizationId = await dbContext.Users
                .Where(x => x.Id == actorUserId)
                .Select(x => x.OrganizationId)
                .FirstOrDefaultAsync(cancellationToken);

            if (!actorOrganizationId.HasValue)
            {
                throw new UnauthorizedAccessException("Project Manager account is missing an organization assignment");
            }

            if (requestedOrganizationId != Guid.Empty && requestedOrganizationId != actorOrganizationId.Value)
            {
                throw new UnauthorizedAccessException("Project Manager can only create projects inside their organization");
            }

            return actorOrganizationId.Value;
        }

        if (normalizedRole == "systemadmin")
        {
            var actorOrganizationId = await dbContext.Users
                .Where(x => x.Id == actorUserId)
                .Select(x => x.OrganizationId)
                .FirstOrDefaultAsync(cancellationToken);

            if (!actorOrganizationId.HasValue)
            {
                throw new UnauthorizedAccessException("System Admin account is missing an organization assignment");
            }

            if (requestedOrganizationId != Guid.Empty && requestedOrganizationId != actorOrganizationId.Value)
            {
                throw new UnauthorizedAccessException("System Admin can only create projects inside their organization");
            }

            return actorOrganizationId.Value;
        }

        throw new UnauthorizedAccessException("System Admin or Project Manager role is required for this action");
    }

    private async Task EnsureCanManageProjectAsync(Project project, Guid actorUserId, string actorRole, CancellationToken cancellationToken)
    {
        var normalizedRole = NormalizeRole(actorRole);
        if (normalizedRole == "systemadmin")
        {
            var actorOrganizationId = await dbContext.Users
                .Where(x => x.Id == actorUserId)
                .Select(x => x.OrganizationId)
                .FirstOrDefaultAsync(cancellationToken);

            if (!actorOrganizationId.HasValue || actorOrganizationId.Value != project.OrganizationId)
            {
                throw new UnauthorizedAccessException("System Admin can only manage projects inside their organization");
            }

            return;
        }

        if (normalizedRole == "projectmanager")
        {
            var isLead = project.Members.Any(member => member.UserId == actorUserId && member.MemberRole == MemberRole.Lead);
            if (project.CreatedByUserId != actorUserId && !isLead)
            {
                throw new UnauthorizedAccessException("Project Manager can only manage owned or lead-assigned projects");
            }

            return;
        }

        throw new UnauthorizedAccessException("System Admin or Project Manager role is required for this action");
    }

    private static ProjectDto MapProject(Project project)
    {
        return new ProjectDto
        {
            Id = project.Id,
            Title = project.Title,
            Description = project.Description,
            Status = project.Status.ToString(),
            Priority = project.Priority.ToString(),
            StartDate = project.StartDate,
            EndDate = project.EndDate,
            CreatedByUserId = project.CreatedByUserId,
            OrganizationId = project.OrganizationId,
            CreatedAt = project.CreatedAt,
            UpdatedAt = project.UpdatedAt,
            MemberCount = project.Members.Count,
            TotalTasks = project.Tasks.Count,
            CompletedTasks = project.Tasks.Count(x => x.Status == Domain.Enums.TaskStatus.Done)
        };
    }

    private static string NormalizeRole(string role)
    {
        return role.Replace(" ", string.Empty).Trim().ToLowerInvariant();
    }

    private static ProjectStatus ParseProjectStatus(string value)
    {
        if (!Enum.TryParse<ProjectStatus>(value, true, out var parsed))
        {
            throw new InvalidOperationException("Invalid project status");
        }

        return parsed;
    }

    private static ProjectPriority ParseProjectPriority(string value)
    {
        if (!Enum.TryParse<ProjectPriority>(value, true, out var parsed))
        {
            throw new InvalidOperationException("Invalid project priority");
        }

        return parsed;
    }
}
