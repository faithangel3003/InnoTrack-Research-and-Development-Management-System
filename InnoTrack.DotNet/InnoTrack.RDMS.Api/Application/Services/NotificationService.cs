using InnoTrack.RDMS.Api.Application.Dtos.Collaboration;
using InnoTrack.RDMS.Api.Application.Interfaces.Repositories;
using InnoTrack.RDMS.Api.Application.Interfaces.Services;
using InnoTrack.RDMS.Api.Domain.Entities;
using InnoTrack.RDMS.Api.Domain.Enums;
using InnoTrack.RDMS.Api.Hubs;
using InnoTrack.RDMS.Api.Infrastructure.Data;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace InnoTrack.RDMS.Api.Application.Services;

public class NotificationService(
    INotificationRepository notificationRepository,
    AppDbContext dbContext,
    IHubContext<CollaborationHub> hubContext) : INotificationService
{
    public async Task<List<NotificationDto>> GetUserNotificationsAsync(Guid actorUserId, CancellationToken cancellationToken = default)
    {
        var notifications = await notificationRepository.GetByUserAsync(actorUserId, cancellationToken);
        return notifications.Select(CollaborationMapper.MapNotification).ToList();
    }

    public async Task<NotificationSummaryDto> GetUnreadCountAsync(Guid actorUserId, CancellationToken cancellationToken = default)
    {
        var notifications = await notificationRepository.GetByUserAsync(actorUserId, cancellationToken);
        return new NotificationSummaryDto
        {
            TotalUnreadCount = notifications.Count(x => !x.IsRead),
            CountsByType = notifications
                .Where(x => !x.IsRead)
                .GroupBy(x => x.Type.ToString())
                .ToDictionary(group => group.Key, group => group.Count(), StringComparer.OrdinalIgnoreCase),
        };
    }

    public async Task<NotificationDto?> MarkAsReadAsync(Guid notificationId, Guid actorUserId, CancellationToken cancellationToken = default)
    {
        var notification = await notificationRepository.GetByIdAsync(notificationId, actorUserId, cancellationToken);
        if (notification is null)
        {
            return null;
        }

        if (!notification.IsRead)
        {
            notification.IsRead = true;
            notificationRepository.Update(notification);
            await notificationRepository.SaveChangesAsync(cancellationToken);
        }

        return CollaborationMapper.MapNotification(notification);
    }

    public Task MarkAllAsReadAsync(Guid actorUserId, CancellationToken cancellationToken = default)
    {
        return notificationRepository.MarkAllAsReadAsync(actorUserId, cancellationToken);
    }

    public async Task<NotificationDto> CreateNotificationAsync(Guid userId, NotificationType type, string title, string message, Guid? referenceId = null, string? referenceType = null, CancellationToken cancellationToken = default)
    {
        var notification = new Notification
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Title = title.Trim(),
            Message = message.Trim(),
            Type = type,
            ReferenceId = referenceId,
            ReferenceType = referenceType,
            IsRead = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        await notificationRepository.AddAsync(notification, cancellationToken);
        await notificationRepository.SaveChangesAsync(cancellationToken);

        var dto = CollaborationMapper.MapNotification(notification);
        await SendNotificationToUserAsync(userId, dto, cancellationToken);
        return dto;
    }

    public async Task CreateNotificationsAsync(IEnumerable<Guid> userIds, Guid actorUserId, NotificationType type, string title, string message, Guid? referenceId = null, string? referenceType = null, CancellationToken cancellationToken = default)
    {
        var recipientIds = userIds
            .Where(userId => userId != Guid.Empty && userId != actorUserId)
            .Distinct()
            .ToList();

        if (recipientIds.Count == 0)
        {
            return;
        }

        var activeRecipientIds = await dbContext.Users
            .Where(user => user.IsActive && recipientIds.Contains(user.Id))
            .Select(user => user.Id)
            .ToListAsync(cancellationToken);

        foreach (var userId in activeRecipientIds)
        {
            await CreateNotificationAsync(userId, type, title, message, referenceId, referenceType, cancellationToken);
        }
    }

    public Task SendNotificationToUserAsync(Guid userId, NotificationDto notification, CancellationToken cancellationToken = default)
    {
        return hubContext.Clients.Group(CollaborationHub.UserGroup(userId))
            .SendAsync("NotificationReceived", notification, cancellationToken);
    }
}