using InnoTrack.RDMS.Api.Application.Dtos.Members;

namespace InnoTrack.RDMS.Api.Application.Interfaces.Services;

public interface IProjectMemberService
{
    Task<List<ProjectMemberDto>> GetMembersAsync(Guid projectId, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default);
    Task<ProjectMemberDto> AddMemberAsync(Guid projectId, AddProjectMemberDto request, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default);
    Task<bool> RemoveMemberAsync(Guid projectId, Guid userId, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default);
}
