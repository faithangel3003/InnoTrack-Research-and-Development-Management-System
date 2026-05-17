using InnoTrack.RDMS.Api.Application.Interfaces.Repositories;
using InnoTrack.RDMS.Api.Domain.Entities;
using InnoTrack.RDMS.Api.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace InnoTrack.RDMS.Api.Infrastructure.Repositories;

public class NotificationRepository(AppDbContext dbContext) : INotificationRepository
{
    public Task<List<Notification>> GetByUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return dbContext.Notifications
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public Task<Notification?> GetByIdAsync(Guid id, Guid userId, CancellationToken cancellationToken = default)
    {
        return dbContext.Notifications.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId, cancellationToken);
    }

    public Task<int> GetUnreadCountAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return dbContext.Notifications.CountAsync(x => x.UserId == userId && !x.IsRead, cancellationToken);
    }

    public Task AddAsync(Notification notification, CancellationToken cancellationToken = default)
    {
        return dbContext.Notifications.AddAsync(notification, cancellationToken).AsTask();
    }

    public Task AddRangeAsync(IEnumerable<Notification> notifications, CancellationToken cancellationToken = default)
    {
        return dbContext.Notifications.AddRangeAsync(notifications, cancellationToken);
    }

    public void Update(Notification notification)
    {
        dbContext.Notifications.Update(notification);
    }

    public Task MarkAllAsReadAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return dbContext.Notifications
            .Where(x => x.UserId == userId && !x.IsRead)
            .ExecuteUpdateAsync(setters => setters.SetProperty(x => x.IsRead, true), cancellationToken);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return dbContext.SaveChangesAsync(cancellationToken);
    }
}