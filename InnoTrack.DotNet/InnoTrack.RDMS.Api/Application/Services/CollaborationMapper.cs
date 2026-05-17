using InnoTrack.RDMS.Api.Application.Dtos.Collaboration;
using InnoTrack.RDMS.Api.Domain.Entities;

namespace InnoTrack.RDMS.Api.Application.Services;

internal static class CollaborationMapper
{
    public static ChannelDto MapChannel(Channel channel, Guid actorUserId)
    {
        var membership = channel.Members.FirstOrDefault(x => x.UserId == actorUserId);
        var lastReadAt = membership?.LastReadAt ?? DateTime.MinValue;
        var lastActivityAt = channel.Messages.Count > 0
            ? channel.Messages.Max(x => x.CreatedAt)
            : channel.UpdatedAt;

        var unreadCount = membership is null
            ? 0
            : channel.Messages.Count(x => !x.IsDeleted && x.SenderId != actorUserId && x.CreatedAt > lastReadAt);

        return new ChannelDto
        {
            Id = channel.Id,
            Name = channel.Name,
            Description = channel.Description,
            Type = channel.Type,
            ProjectId = channel.ProjectId,
            ProjectTitle = channel.Project?.Title,
            OrganizationId = channel.OrganizationId,
            CreatedByUserId = channel.CreatedByUserId,
            IsArchived = channel.IsArchived,
            MemberCount = channel.Members.Count,
            UnreadCount = unreadCount,
            LastActivityAt = lastActivityAt,
            CreatedAt = channel.CreatedAt,
            UpdatedAt = channel.UpdatedAt,
        };
    }

    public static ChannelMemberDto MapChannelMember(ChannelMember member)
    {
        return new ChannelMemberDto
        {
            Id = member.Id,
            ChannelId = member.ChannelId,
            UserId = member.UserId,
            DisplayName = CollaborationAuthorizationHelper.ResolveUserName(member.User),
            Email = member.User.Email,
            Role = member.Role,
            JoinedAt = member.JoinedAt,
            LastReadAt = member.LastReadAt,
        };
    }

    public static List<MessageReactionDto> MapReactionSummary(IEnumerable<MessageReaction> reactions, Guid actorUserId)
    {
        return reactions
            .GroupBy(x => x.Emoji)
            .Select(group => new MessageReactionDto
            {
                Emoji = group.Key,
                Count = group.Count(),
                UserNames = group
                    .Select(x => CollaborationAuthorizationHelper.ResolveUserName(x.User))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .OrderBy(x => x)
                    .ToList(),
                ReactedByCurrentUser = group.Any(x => x.UserId == actorUserId),
            })
            .OrderBy(x => x.Emoji)
            .ToList();
    }

    public static MessageDto MapMessage(Message message, Guid actorUserId)
    {
        return new MessageDto
        {
            Id = message.Id,
            ChannelId = message.ChannelId,
            SenderId = message.SenderId,
            SenderName = CollaborationAuthorizationHelper.ResolveUserName(message.Sender),
            Content = message.Content,
            Type = message.Type,
            ParentMessageId = message.ParentMessageId,
            IsEdited = message.IsEdited,
            EditedAt = message.EditedAt,
            IsPinned = message.IsPinned,
            IsDeleted = message.IsDeleted,
            DeletedAt = message.DeletedAt,
            CreatedAt = message.CreatedAt,
            UpdatedAt = message.UpdatedAt,
            Attachments = message.Attachments
                .OrderBy(x => x.UploadedAt)
                .Select(x => new MessageAttachmentDto
                {
                    Id = x.Id,
                    FileName = x.FileName,
                    OriginalFileName = x.OriginalFileName,
                    FileSize = x.FileSize,
                    FileType = x.FileType,
                    UploadedAt = x.UploadedAt,
                })
                .ToList(),
            Reactions = MapReactionSummary(message.Reactions, actorUserId),
        };
    }

    public static AnnouncementDto MapAnnouncement(Announcement announcement)
    {
        return new AnnouncementDto
        {
            Id = announcement.Id,
            Title = announcement.Title,
            Content = announcement.Content,
            PostedByUserId = announcement.PostedByUserId,
            PostedByName = CollaborationAuthorizationHelper.ResolveUserName(announcement.PostedByUser),
            OrganizationId = announcement.OrganizationId,
            ProjectId = announcement.ProjectId,
            ProjectTitle = announcement.Project?.Title,
            Priority = announcement.Priority,
            IsPublished = announcement.IsPublished,
            PublishedAt = announcement.PublishedAt,
            ExpiresAt = announcement.ExpiresAt,
            ReadCount = announcement.ReadReceipts.Count,
            CreatedAt = announcement.CreatedAt,
            UpdatedAt = announcement.UpdatedAt,
        };
    }

    public static NotificationDto MapNotification(Notification notification)
    {
        return new NotificationDto
        {
            Id = notification.Id,
            UserId = notification.UserId,
            Title = notification.Title,
            Message = notification.Message,
            Type = notification.Type,
            ReferenceId = notification.ReferenceId,
            ReferenceType = notification.ReferenceType,
            IsRead = notification.IsRead,
            CreatedAt = notification.CreatedAt,
        };
    }
}