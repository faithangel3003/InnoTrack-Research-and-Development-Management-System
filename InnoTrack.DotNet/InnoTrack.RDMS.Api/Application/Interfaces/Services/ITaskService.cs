using InnoTrack.RDMS.Api.Application.Dtos.Tasks;

namespace InnoTrack.RDMS.Api.Application.Interfaces.Services;

public interface ITaskService
{
    Task<List<ProjectTaskDto>> GetTasksByProjectAsync(Guid projectId, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default);
    Task<ProjectTaskDto?> GetTaskByIdAsync(Guid id, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default);
    Task<ProjectTaskDto> CreateTaskAsync(Guid projectId, CreateTaskDto request, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default);
    Task<ProjectTaskDto?> UpdateTaskAsync(Guid id, UpdateTaskDto request, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default);
    Task<ProjectTaskDto?> UpdateTaskStatusAsync(Guid id, UpdateTaskStatusDto request, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default);
    Task<bool> DeleteTaskAsync(Guid id, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default);
    Task<List<ProjectTaskDto>> GetMyTasksAsync(Guid actorUserId, CancellationToken cancellationToken = default);
}
