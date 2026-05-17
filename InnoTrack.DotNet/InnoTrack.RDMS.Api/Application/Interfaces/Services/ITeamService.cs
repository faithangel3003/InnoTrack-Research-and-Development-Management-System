using InnoTrack.RDMS.Api.Application.Dtos.Teams;

namespace InnoTrack.RDMS.Api.Application.Interfaces.Services;

public interface ITeamService
{
    Task<List<TeamDto>> GetTeamsAsync(Guid actorUserId, string actorRole, Guid? organizationId, CancellationToken cancellationToken = default);
    Task<TeamDto?> GetTeamByIdAsync(Guid id, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default);
    Task<TeamDto> CreateTeamAsync(CreateTeamDto request, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default);
    Task<TeamDto?> UpdateTeamAsync(Guid id, UpdateTeamDto request, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default);
    Task<bool> DeleteTeamAsync(Guid id, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default);
}