using InnoTrack.RDMS.Api.Application.Dtos.Milestones;

namespace InnoTrack.RDMS.Api.Application.Interfaces.Services;

public interface IMilestoneService
{
    Task<List<MilestoneDto>> GetMilestonesByProjectAsync(Guid projectId, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default);
    Task<MilestoneDto> CreateMilestoneAsync(Guid projectId, CreateMilestoneDto request, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default);
    Task<MilestoneDto?> CompleteMilestoneAsync(Guid id, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default);
    Task<bool> DeleteMilestoneAsync(Guid id, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default);
}
