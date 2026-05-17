using InnoTrack.RDMS.Api.Application.Dtos.Collaboration;

namespace InnoTrack.RDMS.Api.Application.Interfaces.Services;

public interface IMessageService
{
    Task<List<MessageDto>> GetChannelMessagesAsync(Guid channelId, Guid actorUserId, string actorRole, int skip = 0, int take = 100, CancellationToken cancellationToken = default);
    Task<ThreadedMessageDto?> GetThreadMessagesAsync(Guid messageId, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default);
    Task<List<MessageDto>> GetPinnedMessagesAsync(Guid channelId, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default);
    Task<List<MessageDto>> SearchMessagesAsync(Guid channelId, string query, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default);
    Task<MessageDto> SendMessageAsync(Guid channelId, SendMessageDto request, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default);
    Task<MessageDto?> EditMessageAsync(Guid messageId, UpdateMessageDto request, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default);
    Task<bool> DeleteMessageAsync(Guid messageId, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default);
    Task<MessageDto?> PinMessageAsync(Guid messageId, bool pinned, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default);
}