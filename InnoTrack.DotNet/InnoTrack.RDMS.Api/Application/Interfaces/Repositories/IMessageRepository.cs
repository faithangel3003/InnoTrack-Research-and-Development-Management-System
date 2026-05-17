using InnoTrack.RDMS.Api.Domain.Entities;

namespace InnoTrack.RDMS.Api.Application.Interfaces.Repositories;

public interface IMessageRepository
{
    Task<List<Message>> GetByChannelAsync(Guid channelId, int skip, int take, CancellationToken cancellationToken = default);
    Task<List<Message>> SearchByChannelAsync(Guid channelId, string query, CancellationToken cancellationToken = default);
    Task<List<Message>> GetPinnedMessagesAsync(Guid channelId, CancellationToken cancellationToken = default);
    Task<Message?> GetByIdAsync(Guid id, bool includeChannel, CancellationToken cancellationToken = default);
    Task<List<Message>> GetThreadRepliesAsync(Guid parentMessageId, CancellationToken cancellationToken = default);
    Task AddAsync(Message message, CancellationToken cancellationToken = default);
    void Update(Message message);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}