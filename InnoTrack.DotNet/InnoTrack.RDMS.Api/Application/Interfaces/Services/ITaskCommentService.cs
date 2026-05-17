using InnoTrack.RDMS.Api.Application.Dtos.Comments;

namespace InnoTrack.RDMS.Api.Application.Interfaces.Services;

public interface ITaskCommentService
{
    Task<List<TaskCommentDto>> GetCommentsByTaskAsync(Guid taskId, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default);
    Task<TaskCommentDto> AddCommentAsync(Guid taskId, CreateTaskCommentDto request, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default);
    Task<bool> DeleteCommentAsync(Guid commentId, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default);
}
