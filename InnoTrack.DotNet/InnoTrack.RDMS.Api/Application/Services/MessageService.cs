using System.Text.RegularExpressions;
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

public partial class MessageService(
    IMessageRepository messageRepository,
    IChannelRepository channelRepository,
    INotificationService notificationService,
    IAuditLogService auditLogService,
    AppDbContext dbContext,
    IHubContext<CollaborationHub> hubContext) : IMessageService
{
    public async Task<List<MessageDto>> GetChannelMessagesAsync(Guid channelId, Guid actorUserId, string actorRole, int skip = 0, int take = 100, CancellationToken cancellationToken = default)
    {
        var channel = await GetAccessibleChannelAsync(channelId, actorUserId, actorRole, cancellationToken);
        var messages = await messageRepository.GetByChannelAsync(channel.Id, skip, take, cancellationToken);
        return messages.Select(message => CollaborationMapper.MapMessage(message, actorUserId)).ToList();
    }

    public async Task<ThreadedMessageDto?> GetThreadMessagesAsync(Guid messageId, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default)
    {
        var message = await messageRepository.GetByIdAsync(messageId, true, cancellationToken);
        if (message is null)
        {
            return null;
        }

        await EnsureChannelAccessAsync(message.Channel, actorUserId, actorRole, cancellationToken);
        var replies = await messageRepository.GetThreadRepliesAsync(messageId, cancellationToken);

        return new ThreadedMessageDto
        {
            Parent = CollaborationMapper.MapMessage(message, actorUserId),
            Replies = replies.Select(reply => CollaborationMapper.MapMessage(reply, actorUserId)).ToList(),
        };
    }

    public async Task<List<MessageDto>> GetPinnedMessagesAsync(Guid channelId, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default)
    {
        var channel = await GetAccessibleChannelAsync(channelId, actorUserId, actorRole, cancellationToken);
        var messages = await messageRepository.GetPinnedMessagesAsync(channel.Id, cancellationToken);
        return messages.Select(message => CollaborationMapper.MapMessage(message, actorUserId)).ToList();
    }

    public async Task<List<MessageDto>> SearchMessagesAsync(Guid channelId, string query, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default)
    {
        var channel = await GetAccessibleChannelAsync(channelId, actorUserId, actorRole, cancellationToken);
        var messages = await messageRepository.SearchByChannelAsync(channel.Id, query, cancellationToken);
        return messages.Select(message => CollaborationMapper.MapMessage(message, actorUserId)).ToList();
    }

    public async Task<MessageDto> SendMessageAsync(Guid channelId, SendMessageDto request, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var channel = await GetAccessibleChannelAsync(channelId, actorUserId, actorRole, cancellationToken);
        await EnsureMembershipForPostingAsync(channel, actorUserId, actorRole, cancellationToken);

        var message = new Message
        {
            Id = Guid.NewGuid(),
            ChannelId = channel.Id,
            SenderId = actorUserId,
            Content = request.Content.Trim(),
            Type = MessageType.Text,
            ParentMessageId = request.ParentMessageId,
            IsEdited = false,
            IsPinned = false,
            IsDeleted = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        await messageRepository.AddAsync(message, cancellationToken);
        await messageRepository.SaveChangesAsync(cancellationToken);

        var created = await messageRepository.GetByIdAsync(message.Id, true, cancellationToken)
            ?? throw new InvalidOperationException("Message could not be loaded after creation");

        await NotifyChannelMembersAsync(channel, created, actorUserId, cancellationToken);
        await NotifyMentionsAsync(channel, created, actorUserId, cancellationToken);
        await auditLogService.LogActionAsync(actorUserId, actorUserId, channel.OrganizationId, "collaboration.message.create", "messages", created.Id, "info", ipAddress, cancellationToken);

        var dto = CollaborationMapper.MapMessage(created, actorUserId);
        await hubContext.Clients.Group(CollaborationHub.ChannelGroup(channel.Id))
            .SendAsync("ReceiveMessage", dto, cancellationToken);

        return dto;
    }

    public async Task<MessageDto?> EditMessageAsync(Guid messageId, UpdateMessageDto request, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var message = await messageRepository.GetByIdAsync(messageId, true, cancellationToken);
        if (message is null)
        {
            return null;
        }

        await EnsureChannelAccessAsync(message.Channel, actorUserId, actorRole, cancellationToken);
        if (message.SenderId != actorUserId)
        {
            throw new UnauthorizedAccessException("Only the original sender can edit this message");
        }

        message.Content = request.Content.Trim();
        message.IsEdited = true;
        message.EditedAt = DateTime.UtcNow;
        message.UpdatedAt = DateTime.UtcNow;
        messageRepository.Update(message);
        await messageRepository.SaveChangesAsync(cancellationToken);

        await auditLogService.LogActionAsync(actorUserId, actorUserId, message.Channel.OrganizationId, "collaboration.message.edit", "messages", message.Id, "info", ipAddress, cancellationToken);

        var dto = CollaborationMapper.MapMessage(message, actorUserId);
        await hubContext.Clients.Group(CollaborationHub.ChannelGroup(message.ChannelId))
            .SendAsync("MessageEdited", dto, cancellationToken);

        return dto;
    }

    public async Task<bool> DeleteMessageAsync(Guid messageId, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var message = await messageRepository.GetByIdAsync(messageId, true, cancellationToken);
        if (message is null)
        {
            return false;
        }

        await EnsureChannelAccessAsync(message.Channel, actorUserId, actorRole, cancellationToken);

        var isModerator = CollaborationAuthorizationHelper.IsOrganizationAdmin(actorRole)
            || CollaborationAuthorizationHelper.IsSuperAdmin(actorRole)
            || message.Channel.Members.Any(member => member.UserId == actorUserId && member.Role is ChannelMemberRole.Owner or ChannelMemberRole.Moderator);

        if (message.SenderId != actorUserId && !isModerator)
        {
            throw new UnauthorizedAccessException("You do not have permission to delete this message");
        }

        message.Content = "This message was deleted";
        message.IsDeleted = true;
        message.DeletedAt = DateTime.UtcNow;
        message.UpdatedAt = DateTime.UtcNow;
        messageRepository.Update(message);
        await messageRepository.SaveChangesAsync(cancellationToken);

        await auditLogService.LogActionAsync(actorUserId, actorUserId, message.Channel.OrganizationId, "collaboration.message.delete", "messages", message.Id, "warning", ipAddress, cancellationToken);
        await hubContext.Clients.Group(CollaborationHub.ChannelGroup(message.ChannelId))
            .SendAsync("MessageDeleted", message.Id, cancellationToken);

        return true;
    }

    public async Task<MessageDto?> PinMessageAsync(Guid messageId, bool pinned, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var message = await messageRepository.GetByIdAsync(messageId, true, cancellationToken);
        if (message is null)
        {
            return null;
        }

        await EnsureChannelAccessAsync(message.Channel, actorUserId, actorRole, cancellationToken);

        var canPin = CollaborationAuthorizationHelper.IsOrganizationAdmin(actorRole)
            || CollaborationAuthorizationHelper.IsSuperAdmin(actorRole)
            || CollaborationAuthorizationHelper.NormalizeRole(actorRole) == "projectmanager"
            || message.Channel.Members.Any(member => member.UserId == actorUserId && member.Role is ChannelMemberRole.Owner or ChannelMemberRole.Moderator);

        if (!canPin)
        {
            throw new UnauthorizedAccessException("You do not have permission to pin messages in this channel");
        }

        message.IsPinned = pinned;
        message.UpdatedAt = DateTime.UtcNow;
        messageRepository.Update(message);
        await messageRepository.SaveChangesAsync(cancellationToken);

        await auditLogService.LogActionAsync(actorUserId, actorUserId, message.Channel.OrganizationId, pinned ? "collaboration.message.pin" : "collaboration.message.unpin", "messages", message.Id, "info", ipAddress, cancellationToken);

        var dto = CollaborationMapper.MapMessage(message, actorUserId);
        await hubContext.Clients.Group(CollaborationHub.ChannelGroup(message.ChannelId))
            .SendAsync("MessageEdited", dto, cancellationToken);

        return dto;
    }

    private async Task<Channel> GetAccessibleChannelAsync(Guid channelId, Guid actorUserId, string actorRole, CancellationToken cancellationToken)
    {
        var channel = await channelRepository.GetByIdAsync(channelId, true, false, cancellationToken)
            ?? throw new InvalidOperationException("Channel not found");

        await EnsureChannelAccessAsync(channel, actorUserId, actorRole, cancellationToken);
        return channel;
    }

    private async Task EnsureChannelAccessAsync(Channel channel, Guid actorUserId, string actorRole, CancellationToken cancellationToken)
    {
        if (CollaborationAuthorizationHelper.IsSuperAdmin(actorRole))
        {
            return;
        }

        var actorOrganizationId = await dbContext.Users
            .Where(x => x.Id == actorUserId)
            .Select(x => x.OrganizationId)
            .FirstOrDefaultAsync(cancellationToken);

        if (!actorOrganizationId.HasValue || actorOrganizationId.Value != channel.OrganizationId)
        {
            throw new UnauthorizedAccessException("You are not allowed to access this collaboration channel");
        }

        if (!CollaborationAuthorizationHelper.IsOrganizationAdmin(actorRole) && channel.Members.All(x => x.UserId != actorUserId))
        {
            throw new UnauthorizedAccessException("You must be a member of this collaboration channel");
        }
    }

    private async Task EnsureMembershipForPostingAsync(Channel channel, Guid actorUserId, string actorRole, CancellationToken cancellationToken)
    {
        if (channel.Members.Any(x => x.UserId == actorUserId))
        {
            return;
        }

        if (!CollaborationAuthorizationHelper.IsOrganizationAdmin(actorRole) && !CollaborationAuthorizationHelper.IsSuperAdmin(actorRole))
        {
            throw new UnauthorizedAccessException("Only channel members can post messages");
        }

        await channelRepository.AddMemberAsync(new ChannelMember
        {
            Id = Guid.NewGuid(),
            ChannelId = channel.Id,
            UserId = actorUserId,
            Role = ChannelMemberRole.Moderator,
            JoinedAt = DateTime.UtcNow,
            LastReadAt = DateTime.UtcNow,
        }, cancellationToken);
        await channelRepository.SaveChangesAsync(cancellationToken);
        channel.Members.Add(new ChannelMember
        {
            ChannelId = channel.Id,
            UserId = actorUserId,
            Role = ChannelMemberRole.Moderator,
        });
    }

    private async Task NotifyChannelMembersAsync(Channel channel, Message message, Guid actorUserId, CancellationToken cancellationToken)
    {
        var senderName = CollaborationAuthorizationHelper.ResolveUserName(message.Sender);
        var recipientIds = channel.Members
            .Where(member => member.UserId != actorUserId)
            .Select(member => member.UserId)
            .Distinct()
            .ToList();

        foreach (var userId in recipientIds)
        {
            await notificationService.CreateNotificationAsync(
                userId,
                NotificationType.MessageReceived,
                $"New message in {channel.Name}",
                $"{senderName} posted a new message in {channel.Name}.",
                message.Id,
                "Message",
                cancellationToken);
        }
    }

    private async Task NotifyMentionsAsync(Channel channel, Message message, Guid actorUserId, CancellationToken cancellationToken)
    {
        var mentionKeys = MentionRegex()
            .Matches(message.Content)
            .Select(match => match.Groups[1].Value.Trim())
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (mentionKeys.Count == 0)
        {
            return;
        }

        var candidates = await dbContext.Users
            .Where(x => x.OrganizationId == channel.OrganizationId && x.IsActive)
            .ToListAsync(cancellationToken);

        var recipientIds = candidates
            .Where(user => user.Id != actorUserId)
            .Where(user => mentionKeys.Contains(user.Email.Split('@')[0], StringComparer.OrdinalIgnoreCase)
                || mentionKeys.Contains($"{user.FirstName}{user.LastName}".Replace(" ", string.Empty), StringComparer.OrdinalIgnoreCase)
                || mentionKeys.Contains(CollaborationAuthorizationHelper.ResolveUserName(user).Replace(" ", string.Empty), StringComparer.OrdinalIgnoreCase))
            .Select(user => user.Id)
            .Distinct()
            .ToList();

        foreach (var userId in recipientIds)
        {
            await notificationService.CreateNotificationAsync(
                userId,
                NotificationType.MentionReceived,
                $"You were mentioned in {channel.Name}",
                message.Content.Length > 160 ? $"{message.Content[..157]}..." : message.Content,
                message.Id,
                "Message",
                cancellationToken);
        }
    }

    [GeneratedRegex("@([A-Za-z0-9._-]+)")]
    private static partial Regex MentionRegex();
}