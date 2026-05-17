using InnoTrack.RDMS.Api.Application.Dtos.Tasks;
using InnoTrack.RDMS.Api.Application.Interfaces.Repositories;
using InnoTrack.RDMS.Api.Application.Interfaces.Services;
using InnoTrack.RDMS.Api.Domain.Entities;
using InnoTrack.RDMS.Api.Domain.Enums;
using InnoTrack.RDMS.Api.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace InnoTrack.RDMS.Api.Application.Services;

public class TaskService(
    ITaskRepository taskRepository,
    IProjectRepository projectRepository,
    IAuditLogService auditLogService,
    INotificationService notificationService,
    AppDbContext dbContext) : ITaskService
{
    public async Task<List<ProjectTaskDto>> GetTasksByProjectAsync(Guid projectId, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default)
    {
        var project = await projectRepository.GetByIdAsync(projectId, cancellationToken)
            ?? throw new InvalidOperationException("Project not found");

        await EnsureCanReadProjectAsync(project, actorUserId, actorRole, cancellationToken);

        var tasks = await taskRepository.GetByProjectAsync(projectId, cancellationToken);
        var normalizedRole = NormalizeRole(actorRole);

        if (normalizedRole == "teammember")
        {
            tasks = tasks.Where(x => x.AssignedToUserId == actorUserId).ToList();
        }

        return tasks.Select(MapTask).ToList();
    }

    public async Task<ProjectTaskDto?> GetTaskByIdAsync(Guid id, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default)
    {
        var task = await taskRepository.GetByIdAsync(id, cancellationToken);
        if (task is null)
        {
            return null;
        }

        var project = await projectRepository.GetByIdAsync(task.ProjectId, cancellationToken)
                      ?? throw new InvalidOperationException("Project not found");

        await EnsureCanReadProjectAsync(project, actorUserId, actorRole, cancellationToken);

        if (NormalizeRole(actorRole) == "teammember" && task.AssignedToUserId != actorUserId)
        {
            throw new UnauthorizedAccessException("TeamMember can only access assigned tasks");
        }

        return MapTask(task);
    }

    public async Task<ProjectTaskDto> CreateTaskAsync(Guid projectId, CreateTaskDto request, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var project = await projectRepository.GetByIdAsync(projectId, cancellationToken)
                      ?? throw new InvalidOperationException("Project not found");

        await EnsureCanManageProjectAsync(project, actorUserId, actorRole, cancellationToken);

        if (request.DueDate > project.EndDate)
        {
            throw new InvalidOperationException("Task due date cannot be set past project EndDate");
        }

        await EnsureAssigneeCanReceiveTaskAsync(project, request.AssignedToUserId, cancellationToken);

        var task = new ProjectTask
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            Title = request.Title.Trim(),
            Description = request.Description?.Trim(),
            AssignedToUserId = request.AssignedToUserId,
            AssignedByUserId = actorUserId,
            Priority = ParseTaskPriority(request.Priority),
            Status = Domain.Enums.TaskStatus.Todo,
            DueDate = request.DueDate,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await taskRepository.AddAsync(task, cancellationToken);
        await taskRepository.SaveChangesAsync(cancellationToken);

        await auditLogService.LogActionAsync(task.AssignedToUserId, actorUserId, project.OrganizationId, "task.create", "tasks", task.Id, "info", ipAddress, cancellationToken);
        await NotifyTaskActivityAsync(
            task,
            project,
            actorUserId,
            task.AssignedToUserId == actorUserId ? "Task created" : "Task assigned",
            $"{await CrossModuleNotificationHelper.ResolveUserDisplayNameAsync(dbContext, actorUserId, cancellationToken)} {(task.AssignedToUserId == actorUserId ? "created" : "assigned")} task \"{task.Title}\" in project \"{project.Title}\".",
            new[] { task.AssignedToUserId },
            cancellationToken);

        return MapTask(task);
    }

    public async Task<ProjectTaskDto?> UpdateTaskAsync(Guid id, UpdateTaskDto request, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var task = await taskRepository.GetByIdAsync(id, cancellationToken);
        if (task is null)
        {
            return null;
        }

        var project = await projectRepository.GetByIdAsync(task.ProjectId, cancellationToken)
                      ?? throw new InvalidOperationException("Project not found");

        await EnsureCanManageProjectAsync(project, actorUserId, actorRole, cancellationToken);

        if (request.DueDate > project.EndDate)
        {
            throw new InvalidOperationException("Task due date cannot be set past project EndDate");
        }

        await EnsureAssigneeCanReceiveTaskAsync(project, request.AssignedToUserId, cancellationToken);

        var previousAssigneeUserId = task.AssignedToUserId;

        task.Title = request.Title.Trim();
        task.Description = request.Description?.Trim();
        task.AssignedToUserId = request.AssignedToUserId;
        task.Priority = ParseTaskPriority(request.Priority);
        task.DueDate = request.DueDate;
        task.UpdatedAt = DateTime.UtcNow;

        taskRepository.Update(task);
        await taskRepository.SaveChangesAsync(cancellationToken);

        await auditLogService.LogActionAsync(task.AssignedToUserId, actorUserId, project.OrganizationId, "task.update", "tasks", task.Id, "info", ipAddress, cancellationToken);
        await NotifyTaskActivityAsync(
            task,
            project,
            actorUserId,
            previousAssigneeUserId != task.AssignedToUserId ? "Task reassigned" : "Task updated",
            $"{await CrossModuleNotificationHelper.ResolveUserDisplayNameAsync(dbContext, actorUserId, cancellationToken)} {(previousAssigneeUserId != task.AssignedToUserId ? "reassigned" : "updated")} task \"{task.Title}\" in project \"{project.Title}\".",
            new[] { task.AssignedToUserId, previousAssigneeUserId },
            cancellationToken);

        return MapTask(task);
    }

    public async Task<ProjectTaskDto?> UpdateTaskStatusAsync(Guid id, UpdateTaskStatusDto request, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var task = await taskRepository.GetByIdAsync(id, cancellationToken);
        if (task is null)
        {
            return null;
        }

        var project = await projectRepository.GetByIdAsync(task.ProjectId, cancellationToken)
                      ?? throw new InvalidOperationException("Project not found");

        var normalizedRole = NormalizeRole(actorRole);
        if (normalizedRole == "teammember" && task.AssignedToUserId != actorUserId)
        {
            throw new UnauthorizedAccessException("TeamMember can only update assigned tasks");
        }

        if (normalizedRole is "systemadmin" or "projectmanager")
        {
            await EnsureCanManageProjectAsync(project, actorUserId, actorRole, cancellationToken);
        }

        task.Status = ParseTaskStatus(request.Status);
        task.CompletedAt = task.Status == Domain.Enums.TaskStatus.Done ? DateTime.UtcNow : null;
        task.UpdatedAt = DateTime.UtcNow;

        await taskRepository.UpdateStatusAsync(task, cancellationToken);
        await taskRepository.SaveChangesAsync(cancellationToken);

        await auditLogService.LogActionAsync(task.AssignedToUserId, actorUserId, project.OrganizationId, "task.status.update", "tasks", task.Id, "info", ipAddress, cancellationToken);
        await NotifyTaskActivityAsync(
            task,
            project,
            actorUserId,
            "Task status updated",
            $"{await CrossModuleNotificationHelper.ResolveUserDisplayNameAsync(dbContext, actorUserId, cancellationToken)} changed task \"{task.Title}\" to {task.Status} in project \"{project.Title}\".",
            new[] { task.AssignedToUserId },
            cancellationToken);

        return MapTask(task);
    }

    public async Task<bool> DeleteTaskAsync(Guid id, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var task = await taskRepository.GetByIdAsync(id, cancellationToken);
        if (task is null)
        {
            return false;
        }

        var project = await projectRepository.GetByIdAsync(task.ProjectId, cancellationToken)
                      ?? throw new InvalidOperationException("Project not found");
        await EnsureCanManageProjectAsync(project, actorUserId, actorRole, cancellationToken);

        var notificationMessage = $"{await CrossModuleNotificationHelper.ResolveUserDisplayNameAsync(dbContext, actorUserId, cancellationToken)} removed task \"{task.Title}\" from project \"{project.Title}\".";
        var notificationRecipients = await BuildTaskRecipientUserIdsAsync(project, actorUserId, new[] { task.AssignedToUserId }, cancellationToken);

        taskRepository.Remove(task);
        await taskRepository.SaveChangesAsync(cancellationToken);

        await auditLogService.LogActionAsync(task.AssignedToUserId, actorUserId, project.OrganizationId, "task.delete", "tasks", task.Id, "warning", ipAddress, cancellationToken);
        await notificationService.CreateNotificationsAsync(notificationRecipients, actorUserId, NotificationType.TaskAssigned, "Task removed", notificationMessage, task.Id, "task", cancellationToken);

        return true;
    }

    public async Task<List<ProjectTaskDto>> GetMyTasksAsync(Guid actorUserId, CancellationToken cancellationToken = default)
    {
        var tasks = await taskRepository.GetByAssignedUserAsync(actorUserId, cancellationToken);
        return tasks.Select(MapTask).ToList();
    }

    private async Task NotifyTaskActivityAsync(ProjectTask task, Project project, Guid actorUserId, string title, string message, IEnumerable<Guid> additionalRecipientUserIds, CancellationToken cancellationToken)
    {
        var recipientIds = await BuildTaskRecipientUserIdsAsync(project, actorUserId, additionalRecipientUserIds, cancellationToken);
        await notificationService.CreateNotificationsAsync(recipientIds, actorUserId, NotificationType.TaskAssigned, title, message, task.Id, "task", cancellationToken);
    }

    private async Task<List<Guid>> BuildTaskRecipientUserIdsAsync(Project project, Guid actorUserId, IEnumerable<Guid> additionalRecipientUserIds, CancellationToken cancellationToken)
    {
        var recipientIds = await CrossModuleNotificationHelper.GetProjectStakeholderUserIdsAsync(dbContext, project, actorUserId, cancellationToken);
        return recipientIds
            .Concat(additionalRecipientUserIds)
            .Where(userId => userId != Guid.Empty && userId != actorUserId)
            .Distinct()
            .ToList();
    }

    private static ProjectTaskDto MapTask(ProjectTask task)
    {
        return new ProjectTaskDto
        {
            Id = task.Id,
            ProjectId = task.ProjectId,
            Title = task.Title,
            Description = task.Description,
            AssignedToUserId = task.AssignedToUserId,
            AssignedByUserId = task.AssignedByUserId,
            Status = task.Status.ToString(),
            Priority = task.Priority.ToString(),
            DueDate = task.DueDate,
            CompletedAt = task.CompletedAt,
            CreatedAt = task.CreatedAt,
            UpdatedAt = task.UpdatedAt
        };
    }

    private static string NormalizeRole(string role)
    {
        return role.Replace(" ", string.Empty).Trim().ToLowerInvariant();
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
                throw new UnauthorizedAccessException("System Admin can only manage tasks inside their organization");
            }

            return;
        }

        if (normalizedRole == "projectmanager")
        {
            var isLead = project.Members.Any(member => member.UserId == actorUserId && member.MemberRole == MemberRole.Lead);
            if (project.CreatedByUserId != actorUserId && !isLead)
            {
                throw new UnauthorizedAccessException("Project Manager can only manage tasks for owned or lead-assigned projects");
            }

            return;
        }

        throw new UnauthorizedAccessException("System Admin or Project Manager role is required for this action");
    }

    private async Task EnsureAssigneeCanReceiveTaskAsync(Project project, Guid assigneeUserId, CancellationToken cancellationToken)
    {
        var assignee = await dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(user => user.Id == assigneeUserId && user.IsActive, cancellationToken)
            ?? throw new InvalidOperationException("Assignee must be an active user");

        if (assignee.OrganizationId != project.OrganizationId)
        {
            throw new UnauthorizedAccessException("Tasks can only be assigned to users in the project organization");
        }

        var isProjectMember = project.Members.Any(member => member.UserId == assigneeUserId)
            || await dbContext.ProjectMembers.AnyAsync(member => member.ProjectId == project.Id && member.UserId == assigneeUserId, cancellationToken);

        if (!isProjectMember)
        {
            throw new InvalidOperationException("Assignee must be a member of the project before receiving tasks");
        }
    }

    private async Task EnsureCanReadProjectAsync(Project project, Guid actorUserId, string actorRole, CancellationToken cancellationToken)
    {
        var normalizedRole = NormalizeRole(actorRole);
        if (normalizedRole == "superadmin")
        {
            return;
        }

        if (normalizedRole == "systemadmin")
        {
            var actorOrganizationId = await dbContext.Users
                .Where(x => x.Id == actorUserId)
                .Select(x => x.OrganizationId)
                .FirstOrDefaultAsync(cancellationToken);

            if (actorOrganizationId.HasValue && actorOrganizationId.Value == project.OrganizationId)
            {
                return;
            }
        }

        if (normalizedRole == "projectmanager")
        {
            var isLead = project.Members.Any(member => member.UserId == actorUserId && member.MemberRole == MemberRole.Lead);
            if (project.CreatedByUserId == actorUserId || isLead)
            {
                return;
            }
        }

        if (normalizedRole == "teammember")
        {
            var isMember = project.Members.Any(member => member.UserId == actorUserId)
                || await dbContext.ProjectTasks.AnyAsync(task => task.ProjectId == project.Id && task.AssignedToUserId == actorUserId, cancellationToken);
            if (isMember)
            {
                return;
            }
        }

        throw new UnauthorizedAccessException("You are not allowed to access tasks for this project");
    }

    private static Domain.Enums.TaskStatus ParseTaskStatus(string value)
    {
        if (!Enum.TryParse<Domain.Enums.TaskStatus>(value, true, out var parsed))
        {
            throw new InvalidOperationException("Invalid task status");
        }

        return parsed;
    }

    private static TaskPriority ParseTaskPriority(string value)
    {
        if (!Enum.TryParse<TaskPriority>(value, true, out var parsed))
        {
            throw new InvalidOperationException("Invalid task priority");
        }

        return parsed;
    }
}
