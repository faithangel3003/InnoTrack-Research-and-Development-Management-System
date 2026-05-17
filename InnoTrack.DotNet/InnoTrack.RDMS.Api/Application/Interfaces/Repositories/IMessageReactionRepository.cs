using InnoTrack.RDMS.Api.Domain.Entities;

namespace InnoTrack.RDMS.Api.Application.Interfaces.Repositories;

public interface IMessageReactionRepository
{
    Task<List<MessageReaction>> GetByMessageAsync(Guid messageId, CancellationToken cancellationToken = default);
    Task<MessageReaction?> GetAsync(Guid messageId, Guid userId, string emoji, CancellationToken cancellationToken = default);
    Task AddAsync(MessageReaction reaction, CancellationToken cancellationToken = default);
    void Remove(MessageReaction reaction);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}