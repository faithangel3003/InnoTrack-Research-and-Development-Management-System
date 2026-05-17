using System.Collections.Concurrent;
using System.Security.Claims;
using InnoTrack.RDMS.Api.Application.Dtos.Collaboration;
using InnoTrack.RDMS.Api.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace InnoTrack.RDMS.Api.Hubs;

[Authorize]
public class CollaborationHub(
    IChannelService channelService,
    IMessageService messageService,
    IMessageReactionService messageReactionService) : Hub
{
    private static readonly ConcurrentDictionary<string, CancellationTokenSource> TypingTokens = new();

    public static string ChannelGroup(Guid channelId) => $"channel:{channelId}";
    public static string UserGroup(Guid userId) => $"user:{userId}";

    public override async Task OnConnectedAsync()
    {
        var actorId = GetActorId();
        await Groups.AddToGroupAsync(Context.ConnectionId, UserGroup(actorId));
        await base.OnConnectedAsync();
    }

    public async Task JoinChannel(Guid channelId)
    {
        var (actorId, role) = GetActorContext();
        var channel = await channelService.GetChannelByIdAsync(channelId, actorId, role);
        if (channel is null)
        {
            throw new HubException("Channel not found or inaccessible");
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, ChannelGroup(channelId));
    }

    public Task LeaveChannel(Guid channelId)
    {
        return Groups.RemoveFromGroupAsync(Context.ConnectionId, ChannelGroup(channelId));
    }

    public async Task SendMessage(Guid channelId, string content, Guid? parentMessageId = null)
    {
        var (actorId, role) = GetActorContext();
        await messageService.SendMessageAsync(channelId, new SendMessageDto
        {
            Content = content,
            ParentMessageId = parentMessageId,
        }, actorId, role, Context.GetHttpContext()?.Connection.RemoteIpAddress?.ToString());
    }

    public async Task EditMessage(Guid messageId, string newContent)
    {
        var (actorId, role) = GetActorContext();
        var result = await messageService.EditMessageAsync(messageId, new UpdateMessageDto { Content = newContent }, actorId, role, Context.GetHttpContext()?.Connection.RemoteIpAddress?.ToString());
        if (result is null)
        {
            throw new HubException("Message not found");
        }
    }

    public async Task DeleteMessage(Guid messageId)
    {
        var (actorId, role) = GetActorContext();
        var deleted = await messageService.DeleteMessageAsync(messageId, actorId, role, Context.GetHttpContext()?.Connection.RemoteIpAddress?.ToString());
        if (!deleted)
        {
            throw new HubException("Message not found");
        }
    }

    public Task AddReaction(Guid messageId, string emoji)
    {
        var (actorId, role) = GetActorContext();
        return messageReactionService.AddReactionAsync(messageId, new AddReactionDto { Emoji = emoji }, actorId, role);
    }

    public Task RemoveReaction(Guid messageId, string emoji)
    {
        var (actorId, role) = GetActorContext();
        return messageReactionService.RemoveReactionAsync(messageId, emoji, actorId, role);
    }

    public Task MarkChannelAsRead(Guid channelId)
    {
        var (actorId, role) = GetActorContext();
        return channelService.MarkChannelAsReadAsync(channelId, actorId, role);
    }

    public async Task StartTyping(Guid channelId)
    {
        var (actorId, role) = GetActorContext();
        var channel = await channelService.GetChannelByIdAsync(channelId, actorId, role);
        if (channel is null)
        {
            throw new HubException("Channel not found or inaccessible");
        }

        var typingKey = $"{channelId}:{actorId}";
        if (TypingTokens.TryRemove(typingKey, out var previousToken))
        {
            previousToken.Cancel();
            previousToken.Dispose();
        }

        var cts = new CancellationTokenSource();
        TypingTokens[typingKey] = cts;
        await Clients.OthersInGroup(ChannelGroup(channelId)).SendAsync("UserTyping", channelId, ResolveActorName());

        _ = Task.Run(async () =>
        {
            try
            {
                await Task.Delay(TimeSpan.FromSeconds(3), cts.Token);
                await StopTypingInternalAsync(channelId, actorId);
            }
            catch (TaskCanceledException)
            {
            }
        });
    }

    public async Task StopTyping(Guid channelId)
    {
        await StopTypingInternalAsync(channelId, GetActorId());
    }

    private async Task StopTypingInternalAsync(Guid channelId, Guid actorId)
    {
        var typingKey = $"{channelId}:{actorId}";
        if (TypingTokens.TryRemove(typingKey, out var cts))
        {
            cts.Cancel();
            cts.Dispose();
        }

        await Clients.OthersInGroup(ChannelGroup(channelId)).SendAsync("UserStoppedTyping", channelId, ResolveActorName());
    }

    private (Guid ActorId, string Role) GetActorContext()
    {
        var actorClaim = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        var roleClaim = Context.User?.FindFirstValue(ClaimTypes.Role) ?? string.Empty;

        if (!Guid.TryParse(actorClaim, out var actorId))
        {
            throw new HubException("Invalid actor identity");
        }

        return (actorId, roleClaim);
    }

    private Guid GetActorId() => GetActorContext().ActorId;

    private string ResolveActorName()
    {
        return Context.User?.FindFirstValue(ClaimTypes.Name)
            ?? Context.User?.FindFirstValue(ClaimTypes.Email)
            ?? GetActorId().ToString();
    }
}