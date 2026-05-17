using InnoTrack.RDMS.Api.Application.Dtos.Collaboration;
using InnoTrack.RDMS.Api.Application.Interfaces.Repositories;
using InnoTrack.RDMS.Api.Application.Interfaces.Services;
using InnoTrack.RDMS.Api.Domain.Entities;
using InnoTrack.RDMS.Api.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace InnoTrack.RDMS.Api.Application.Services;

public class MessageReactionService(
    IMessageRepository messageRepository,
    IMessageReactionRepository messageReactionRepository,
    IHubContext<CollaborationHub> hubContext) : IMessageReactionService
{
    public async Task<List<MessageReactionDto>> GetReactionsByMessageAsync(Guid messageId, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default)
    {
        var message = await GetAccessibleMessageAsync(messageId, actorUserId, actorRole, cancellationToken);
        return CollaborationMapper.MapReactionSummary(message.Reactions, actorUserId);
    }

    public async Task<List<MessageReactionDto>> AddReactionAsync(Guid messageId, AddReactionDto request, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default)
    {
        var message = await GetAccessibleMessageAsync(messageId, actorUserId, actorRole, cancellationToken);
        var existing = await messageReactionRepository.GetAsync(messageId, actorUserId, request.Emoji, cancellationToken);

        if (existing is null)
        {
            await messageReactionRepository.AddAsync(new MessageReaction
            {
                Id = Guid.NewGuid(),
                MessageId = messageId,
                UserId = actorUserId,
                Emoji = request.Emoji.Trim(),
                CreatedAt = DateTime.UtcNow,
            }, cancellationToken);
            await messageReactionRepository.SaveChangesAsync(cancellationToken);
        }

        var reactions = await messageReactionRepository.GetByMessageAsync(messageId, cancellationToken);
        var summary = CollaborationMapper.MapReactionSummary(reactions, actorUserId);
        await hubContext.Clients.Group(CollaborationHub.ChannelGroup(message.ChannelId))
            .SendAsync("ReactionUpdated", messageId, summary, cancellationToken);

        return summary;
    }

    public async Task<List<MessageReactionDto>> RemoveReactionAsync(Guid messageId, string emoji, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default)
    {
        var message = await GetAccessibleMessageAsync(messageId, actorUserId, actorRole, cancellationToken);
        var existing = await messageReactionRepository.GetAsync(messageId, actorUserId, emoji, cancellationToken);
        if (existing is not null)
        {
            messageReactionRepository.Remove(existing);
            await messageReactionRepository.SaveChangesAsync(cancellationToken);
        }

        var reactions = await messageReactionRepository.GetByMessageAsync(messageId, cancellationToken);
        var summary = CollaborationMapper.MapReactionSummary(reactions, actorUserId);
        await hubContext.Clients.Group(CollaborationHub.ChannelGroup(message.ChannelId))
            .SendAsync("ReactionUpdated", messageId, summary, cancellationToken);

        return summary;
    }

    private async Task<Message> GetAccessibleMessageAsync(Guid messageId, Guid actorUserId, string actorRole, CancellationToken cancellationToken)
    {
        var message = await messageRepository.GetByIdAsync(messageId, true, cancellationToken)
            ?? throw new InvalidOperationException("Message not found");

        if (!CollaborationAuthorizationHelper.IsOrganizationAdmin(actorRole)
            && !CollaborationAuthorizationHelper.IsSuperAdmin(actorRole)
            && message.Channel.Members.All(x => x.UserId != actorUserId))
        {
            throw new UnauthorizedAccessException("You do not have access to this message");
        }

        return message;
    }
}