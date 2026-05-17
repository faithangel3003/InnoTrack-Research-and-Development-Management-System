using InnoTrack.RDMS.Api.Application.Dtos.Collaboration;
using InnoTrack.RDMS.Api.Domain.Enums;

namespace InnoTrack.RDMS.Api.Application.Interfaces.Services;

public interface INotificationService
{
    Task<List<NotificationDto>> GetUserNotificationsAsync(Guid actorUserId, CancellationToken cancellationToken = default);
    Task<NotificationSummaryDto> GetUnreadCountAsync(Guid actorUserId, CancellationToken cancellationToken = default);
    Task<NotificationDto?> MarkAsReadAsync(Guid notificationId, Guid actorUserId, CancellationToken cancellationToken = default);
    Task MarkAllAsReadAsync(Guid actorUserId, CancellationToken cancellationToken = default);
    Task<NotificationDto> CreateNotificationAsync(Guid userId, NotificationType type, string title, string message, Guid? referenceId = null, string? referenceType = null, CancellationToken cancellationToken = default);
    Task CreateNotificationsAsync(IEnumerable<Guid> userIds, Guid actorUserId, NotificationType type, string title, string message, Guid? referenceId = null, string? referenceType = null, CancellationToken cancellationToken = default);
    Task SendNotificationToUserAsync(Guid userId, NotificationDto notification, CancellationToken cancellationToken = default);
}