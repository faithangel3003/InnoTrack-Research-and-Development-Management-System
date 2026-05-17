using InnoTrack.RDMS.Api.Application.Dtos.Comments;
using InnoTrack.RDMS.Api.Application.Interfaces.Repositories;
using InnoTrack.RDMS.Api.Application.Interfaces.Services;
using InnoTrack.RDMS.Api.Domain.Entities;

namespace InnoTrack.RDMS.Api.Application.Services;

public class TaskCommentService(
    ITaskCommentRepository taskCommentRepository,
    ITaskRepository taskRepository,
    IProjectRepository projectRepository,
    IAuditLogService auditLogService) : ITaskCommentService
{
    public async Task<List<TaskCommentDto>> GetCommentsByTaskAsync(Guid taskId, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default)
    {
        var task = await taskRepository.GetByIdAsync(taskId, cancellationToken)
                   ?? throw new InvalidOperationException("Task not found");

        await EnsureCanAccessTask(task, actorUserId, actorRole, cancellationToken);

        var comments = await taskCommentRepository.GetByTaskAsync(taskId, cancellationToken);
        return comments.Select(Map).ToList();
    }

    public async Task<TaskCommentDto> AddCommentAsync(Guid taskId, CreateTaskCommentDto request, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var task = await taskRepository.GetByIdAsync(taskId, cancellationToken)
                   ?? throw new InvalidOperationException("Task not found");
        await EnsureCanAccessTask(task, actorUserId, actorRole, cancellationToken);

        var comment = new TaskComment
        {
            Id = Guid.NewGuid(),
            TaskId = taskId,
            UserId = actorUserId,
            Comment = request.Comment.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        await taskCommentRepository.AddAsync(comment, cancellationToken);
        await taskCommentRepository.SaveChangesAsync(cancellationToken);

        await auditLogService.LogActionAsync(actorUserId, actorUserId, null, "task.comment.add", "task_comments", comment.Id, "info", ipAddress, cancellationToken);
        return Map(comment);
    }

    public async Task<bool> DeleteCommentAsync(Guid commentId, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var comment = await taskCommentRepository.GetByIdAsync(commentId, cancellationToken);
        if (comment is null)
        {
            return false;
        }

        var isOwner = comment.UserId == actorUserId;
        var isProjectManager = NormalizeRole(actorRole) == "projectmanager";

        if (!isOwner && !isProjectManager)
        {
            throw new UnauthorizedAccessException("Only owner or ProjectManager can delete comment");
        }

        taskCommentRepository.Remove(comment);
        await taskCommentRepository.SaveChangesAsync(cancellationToken);

        await auditLogService.LogActionAsync(actorUserId, actorUserId, null, "task.comment.delete", "task_comments", comment.Id, "warning", ipAddress, cancellationToken);
        return true;
    }

    private async Task EnsureCanAccessTask(ProjectTask task, Guid actorUserId, string actorRole, CancellationToken cancellationToken)
    {
        var normalizedRole = NormalizeRole(actorRole);
        if (normalizedRole is "superadmin" or "systemadmin")
        {
            return;
        }

        if (normalizedRole == "teammember" && task.AssignedToUserId != actorUserId)
        {
            throw new UnauthorizedAccessException("TeamMember can only access assigned tasks");
        }

        if (normalizedRole == "projectmanager")
        {
            var project = await projectRepository.GetByIdAsync(task.ProjectId, cancellationToken)
                          ?? throw new InvalidOperationException("Project not found");
            if (project.CreatedByUserId != actorUserId)
            {
                throw new UnauthorizedAccessException("ProjectManager can only access own projects");
            }
        }
    }

    private static TaskCommentDto Map(TaskComment comment)
    {
        return new TaskCommentDto
        {
            Id = comment.Id,
            TaskId = comment.TaskId,
            UserId = comment.UserId,
            Comment = comment.Comment,
            CreatedAt = comment.CreatedAt
        };
    }

    private static string NormalizeRole(string role)
    {
        return role.Replace(" ", string.Empty).Trim().ToLowerInvariant();
    }
}
