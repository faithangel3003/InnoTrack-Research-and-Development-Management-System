using InnoTrack.RDMS.Api.Application.Interfaces.Repositories;
using InnoTrack.RDMS.Api.Domain.Entities;
using InnoTrack.RDMS.Api.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace InnoTrack.RDMS.Api.Infrastructure.Repositories;

public class MessageRepository(AppDbContext dbContext) : IMessageRepository
{
    public Task<List<Message>> GetByChannelAsync(Guid channelId, int skip, int take, CancellationToken cancellationToken = default)
    {
        return ApplyIncludes(dbContext.Messages)
            .Where(x => x.ChannelId == channelId)
            .OrderBy(x => x.CreatedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync(cancellationToken);
    }

    public Task<List<Message>> SearchByChannelAsync(Guid channelId, string query, CancellationToken cancellationToken = default)
    {
        var trimmed = query.Trim();
        return ApplyIncludes(dbContext.Messages)
            .Where(x => x.ChannelId == channelId && x.Content.Contains(trimmed))
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public Task<List<Message>> GetPinnedMessagesAsync(Guid channelId, CancellationToken cancellationToken = default)
    {
        return ApplyIncludes(dbContext.Messages)
            .Where(x => x.ChannelId == channelId && x.IsPinned)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public Task<Message?> GetByIdAsync(Guid id, bool includeChannel, CancellationToken cancellationToken = default)
    {
        IQueryable<Message> query = ApplyIncludes(dbContext.Messages);

        if (includeChannel)
        {
            query = query.Include(x => x.Channel)
                .ThenInclude(x => x.Members)
                .ThenInclude(x => x.User);
        }

        return query.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public Task<List<Message>> GetThreadRepliesAsync(Guid parentMessageId, CancellationToken cancellationToken = default)
    {
        return ApplyIncludes(dbContext.Messages)
            .Where(x => x.ParentMessageId == parentMessageId)
            .OrderBy(x => x.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public Task AddAsync(Message message, CancellationToken cancellationToken = default)
    {
        return dbContext.Messages.AddAsync(message, cancellationToken).AsTask();
    }

    public void Update(Message message)
    {
        dbContext.Messages.Update(message);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return dbContext.SaveChangesAsync(cancellationToken);
    }

    private IQueryable<Message> ApplyIncludes(IQueryable<Message> query)
    {
        return query
            .Include(x => x.Sender)
            .Include(x => x.Attachments)
            .Include(x => x.Reactions)
                .ThenInclude(x => x.User);
    }
}