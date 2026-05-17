using InnoTrack.RDMS.Api.Application.Interfaces.Repositories;
using InnoTrack.RDMS.Api.Domain.Entities;
using InnoTrack.RDMS.Api.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace InnoTrack.RDMS.Api.Infrastructure.Repositories;

public class MessageReactionRepository(AppDbContext dbContext) : IMessageReactionRepository
{
    public Task<List<MessageReaction>> GetByMessageAsync(Guid messageId, CancellationToken cancellationToken = default)
    {
        return dbContext.MessageReactions
            .Include(x => x.User)
            .Where(x => x.MessageId == messageId)
            .ToListAsync(cancellationToken);
    }

    public Task<MessageReaction?> GetAsync(Guid messageId, Guid userId, string emoji, CancellationToken cancellationToken = default)
    {
        var normalizedEmoji = emoji.Trim();
        return dbContext.MessageReactions.FirstOrDefaultAsync(
            x => x.MessageId == messageId && x.UserId == userId && x.Emoji == normalizedEmoji,
            cancellationToken);
    }

    public Task AddAsync(MessageReaction reaction, CancellationToken cancellationToken = default)
    {
        return dbContext.MessageReactions.AddAsync(reaction, cancellationToken).AsTask();
    }

    public void Remove(MessageReaction reaction)
    {
        dbContext.MessageReactions.Remove(reaction);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return dbContext.SaveChangesAsync(cancellationToken);
    }
}