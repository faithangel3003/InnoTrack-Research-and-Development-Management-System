using InnoTrack.RDMS.Api.Application.Dtos.Projects;

namespace InnoTrack.RDMS.Api.Application.Interfaces.Services;

public interface IProjectService
{
    Task<List<ProjectDto>> GetAllProjectsAsync(Guid actorUserId, string actorRole, CancellationToken cancellationToken = default);
    Task<ProjectDto?> GetProjectByIdAsync(Guid id, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default);
    Task<ProjectDto> CreateProjectAsync(CreateProjectDto request, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default);
    Task<ProjectDto?> UpdateProjectAsync(Guid id, UpdateProjectDto request, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default);
    Task<bool> DeleteProjectAsync(Guid id, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default);
    Task<ProjectDto?> ChangeProjectStatusAsync(Guid id, ChangeProjectStatusDto request, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default);
    Task<ProjectSummaryDto?> GetProjectSummaryAsync(Guid id, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default);
}
