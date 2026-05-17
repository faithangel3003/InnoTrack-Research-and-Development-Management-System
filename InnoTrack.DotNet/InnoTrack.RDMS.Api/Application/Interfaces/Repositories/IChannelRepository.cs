using InnoTrack.RDMS.Api.Domain.Entities;

namespace InnoTrack.RDMS.Api.Application.Interfaces.Repositories;

public interface IChannelRepository
{
    Task<List<Channel>> GetAllAsync(Guid? organizationId, bool includeArchived, CancellationToken cancellationToken = default);
    Task<List<Channel>> GetByProjectAsync(Guid projectId, bool includeArchived, CancellationToken cancellationToken = default);
    Task<List<Channel>> GetByUserAsync(Guid userId, Guid? organizationId, bool includeArchived, CancellationToken cancellationToken = default);
    Task<Channel?> GetByIdAsync(Guid id, bool includeMembers, bool includeMessages, CancellationToken cancellationToken = default);
    Task<Channel?> GetDirectMessageAsync(Guid organizationId, Guid firstUserId, Guid secondUserId, CancellationToken cancellationToken = default);
    Task<ChannelMember?> GetMemberAsync(Guid channelId, Guid userId, CancellationToken cancellationToken = default);
    Task<List<ChannelMember>> GetMembersAsync(Guid channelId, CancellationToken cancellationToken = default);
    Task AddAsync(Channel channel, CancellationToken cancellationToken = default);
    Task AddMemberAsync(ChannelMember member, CancellationToken cancellationToken = default);
    void Update(Channel channel);
    void RemoveMember(ChannelMember member);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}