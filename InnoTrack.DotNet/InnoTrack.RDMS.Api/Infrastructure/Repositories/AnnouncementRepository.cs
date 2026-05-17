using InnoTrack.RDMS.Api.Application.Interfaces.Repositories;
using InnoTrack.RDMS.Api.Domain.Entities;
using InnoTrack.RDMS.Api.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace InnoTrack.RDMS.Api.Infrastructure.Repositories;

public class AnnouncementRepository(AppDbContext dbContext) : IAnnouncementRepository
{
    public Task<List<Announcement>> GetByOrganizationAsync(Guid organizationId, CancellationToken cancellationToken = default)
    {
        return ApplyIncludes(dbContext.Announcements)
            .Where(x => x.OrganizationId == organizationId)
            .OrderByDescending(x => x.PublishedAt ?? x.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public Task<List<Announcement>> GetByProjectAsync(Guid projectId, CancellationToken cancellationToken = default)
    {
        return ApplyIncludes(dbContext.Announcements)
            .Where(x => x.ProjectId == projectId)
            .OrderByDescending(x => x.PublishedAt ?? x.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public Task<Announcement?> GetByIdAsync(Guid id, bool includeReadReceipts, CancellationToken cancellationToken = default)
    {
        IQueryable<Announcement> query = dbContext.Announcements
            .Include(x => x.PostedByUser)
            .Include(x => x.Project);

        if (includeReadReceipts)
        {
            query = query.Include(x => x.ReadReceipts);
        }

        return query.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public Task<AnnouncementReadReceipt?> GetReadReceiptAsync(Guid announcementId, Guid userId, CancellationToken cancellationToken = default)
    {
        return dbContext.AnnouncementReadReceipts.FirstOrDefaultAsync(
            x => x.AnnouncementId == announcementId && x.UserId == userId,
            cancellationToken);
    }

    public Task AddAsync(Announcement announcement, CancellationToken cancellationToken = default)
    {
        return dbContext.Announcements.AddAsync(announcement, cancellationToken).AsTask();
    }

    public Task AddReadReceiptAsync(AnnouncementReadReceipt receipt, CancellationToken cancellationToken = default)
    {
        return dbContext.AnnouncementReadReceipts.AddAsync(receipt, cancellationToken).AsTask();
    }

    public void Update(Announcement announcement)
    {
        dbContext.Announcements.Update(announcement);
    }

    public void Remove(Announcement announcement)
    {
        dbContext.Announcements.Remove(announcement);
    }

    public Task<int> GetUnreadCountAsync(Guid organizationId, Guid userId, IReadOnlyCollection<Guid> accessibleProjectIds, CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        return dbContext.Announcements
            .Where(x => x.OrganizationId == organizationId)
            .Where(x => x.IsPublished)
            .Where(x => !x.ExpiresAt.HasValue || x.ExpiresAt > now)
            .Where(x => !x.ProjectId.HasValue || accessibleProjectIds.Contains(x.ProjectId.Value))
            .Where(x => !x.ReadReceipts.Any(receipt => receipt.UserId == userId))
            .CountAsync(cancellationToken);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return dbContext.SaveChangesAsync(cancellationToken);
    }

    private IQueryable<Announcement> ApplyIncludes(IQueryable<Announcement> query)
    {
        return query
            .Include(x => x.PostedByUser)
            .Include(x => x.Project)
            .Include(x => x.ReadReceipts);
    }
}