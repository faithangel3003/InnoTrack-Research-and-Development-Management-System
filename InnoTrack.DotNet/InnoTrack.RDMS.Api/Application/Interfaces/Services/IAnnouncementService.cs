using InnoTrack.RDMS.Api.Application.Dtos.Collaboration;

namespace InnoTrack.RDMS.Api.Application.Interfaces.Services;

public interface IAnnouncementService
{
    Task<List<AnnouncementDto>> GetAnnouncementsAsync(Guid actorUserId, string actorRole, CancellationToken cancellationToken = default);
    Task<AnnouncementDto?> GetAnnouncementByIdAsync(Guid id, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default);
    Task<AnnouncementDto> CreateAnnouncementAsync(CreateAnnouncementDto request, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default);
    Task<AnnouncementDto?> UpdateAnnouncementAsync(Guid id, UpdateAnnouncementDto request, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default);
    Task<AnnouncementDto?> PublishAnnouncementAsync(Guid id, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default);
    Task<bool> DeleteAnnouncementAsync(Guid id, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default);
    Task MarkAsReadAsync(Guid id, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default);
    Task<int> GetUnreadCountAsync(Guid actorUserId, string actorRole, CancellationToken cancellationToken = default);
}