using InnoTrack.RDMS.Api.Application.Interfaces.Repositories;
using InnoTrack.RDMS.Api.Domain.Entities;
using InnoTrack.RDMS.Api.Domain.Enums;
using InnoTrack.RDMS.Api.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace InnoTrack.RDMS.Api.Infrastructure.Repositories;

public class ChannelRepository(AppDbContext dbContext) : IChannelRepository
{
    public Task<List<Channel>> GetAllAsync(Guid? organizationId, bool includeArchived, CancellationToken cancellationToken = default)
    {
        return ApplyChannelIncludes(dbContext.Channels)
            .WhereIf(organizationId.HasValue, x => x.OrganizationId == organizationId!.Value)
            .WhereIf(!includeArchived, x => !x.IsArchived)
            .OrderBy(x => x.Name)
            .ToListAsync(cancellationToken);
    }

    public Task<List<Channel>> GetByProjectAsync(Guid projectId, bool includeArchived, CancellationToken cancellationToken = default)
    {
        return ApplyChannelIncludes(dbContext.Channels)
            .Where(x => x.ProjectId == projectId)
            .WhereIf(!includeArchived, x => !x.IsArchived)
            .OrderBy(x => x.Name)
            .ToListAsync(cancellationToken);
    }

    public Task<List<Channel>> GetByUserAsync(Guid userId, Guid? organizationId, bool includeArchived, CancellationToken cancellationToken = default)
    {
        return ApplyChannelIncludes(dbContext.Channels)
            .Where(x => x.Members.Any(member => member.UserId == userId))
            .WhereIf(organizationId.HasValue, x => x.OrganizationId == organizationId!.Value)
            .WhereIf(!includeArchived, x => !x.IsArchived)
            .OrderBy(x => x.Name)
            .ToListAsync(cancellationToken);
    }

    public Task<Channel?> GetByIdAsync(Guid id, bool includeMembers, bool includeMessages, CancellationToken cancellationToken = default)
    {
        IQueryable<Channel> query = dbContext.Channels
            .Include(x => x.Project);

        if (includeMembers)
        {
            query = query.Include(x => x.Members)
                .ThenInclude(x => x.User);
        }

        if (includeMessages)
        {
            query = query.Include(x => x.Messages);
        }

        return query.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public Task<Channel?> GetDirectMessageAsync(Guid organizationId, Guid firstUserId, Guid secondUserId, CancellationToken cancellationToken = default)
    {
        return ApplyChannelIncludes(dbContext.Channels)
            .Where(x => x.OrganizationId == organizationId && x.Type == ChannelType.DirectMessage)
            .Where(x => x.Members.Count == 2
                && x.Members.Any(member => member.UserId == firstUserId)
                && x.Members.Any(member => member.UserId == secondUserId))
            .FirstOrDefaultAsync(cancellationToken);
    }

    public Task<ChannelMember?> GetMemberAsync(Guid channelId, Guid userId, CancellationToken cancellationToken = default)
    {
        return dbContext.ChannelMembers
            .Include(x => x.User)
            .FirstOrDefaultAsync(x => x.ChannelId == channelId && x.UserId == userId, cancellationToken);
    }

    public Task<List<ChannelMember>> GetMembersAsync(Guid channelId, CancellationToken cancellationToken = default)
    {
        return dbContext.ChannelMembers
            .Include(x => x.User)
            .Where(x => x.ChannelId == channelId)
            .OrderBy(x => x.Role)
            .ThenBy(x => x.JoinedAt)
            .ToListAsync(cancellationToken);
    }

    public Task AddAsync(Channel channel, CancellationToken cancellationToken = default)
    {
        return dbContext.Channels.AddAsync(channel, cancellationToken).AsTask();
    }

    public Task AddMemberAsync(ChannelMember member, CancellationToken cancellationToken = default)
    {
        return dbContext.ChannelMembers.AddAsync(member, cancellationToken).AsTask();
    }

    public void Update(Channel channel)
    {
        dbContext.Channels.Update(channel);
    }

    public void RemoveMember(ChannelMember member)
    {
        dbContext.ChannelMembers.Remove(member);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return dbContext.SaveChangesAsync(cancellationToken);
    }

    private IQueryable<Channel> ApplyChannelIncludes(IQueryable<Channel> query)
    {
        return query
            .Include(x => x.Project)
            .Include(x => x.Members)
                .ThenInclude(x => x.User)
            .Include(x => x.Messages);
    }
}

internal static class CollaborationQueryableExtensions
{
    public static IQueryable<T> WhereIf<T>(this IQueryable<T> query, bool condition, System.Linq.Expressions.Expression<Func<T, bool>> predicate)
    {
        return condition ? query.Where(predicate) : query;
    }
}