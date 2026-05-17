using InnoTrack.RDMS.Api.Domain.Entities;

namespace InnoTrack.RDMS.Api.Application.Interfaces.Repositories;

public interface IAnnouncementRepository
{
    Task<List<Announcement>> GetByOrganizationAsync(Guid organizationId, CancellationToken cancellationToken = default);
    Task<List<Announcement>> GetByProjectAsync(Guid projectId, CancellationToken cancellationToken = default);
    Task<Announcement?> GetByIdAsync(Guid id, bool includeReadReceipts, CancellationToken cancellationToken = default);
    Task<AnnouncementReadReceipt?> GetReadReceiptAsync(Guid announcementId, Guid userId, CancellationToken cancellationToken = default);
    Task AddAsync(Announcement announcement, CancellationToken cancellationToken = default);
    Task AddReadReceiptAsync(AnnouncementReadReceipt receipt, CancellationToken cancellationToken = default);
    void Update(Announcement announcement);
    void Remove(Announcement announcement);
    Task<int> GetUnreadCountAsync(Guid organizationId, Guid userId, IReadOnlyCollection<Guid> accessibleProjectIds, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}