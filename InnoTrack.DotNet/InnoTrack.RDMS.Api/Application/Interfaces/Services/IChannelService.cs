using InnoTrack.RDMS.Api.Application.Dtos.Collaboration;

namespace InnoTrack.RDMS.Api.Application.Interfaces.Services;

public interface IChannelService
{
    Task<List<ChannelDto>> GetUserChannelsAsync(Guid actorUserId, string actorRole, CancellationToken cancellationToken = default);
    Task<ChannelDto?> GetChannelByIdAsync(Guid id, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default);
    Task<List<ChannelMemberDto>> GetMembersAsync(Guid channelId, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default);
    Task<List<ChannelDto>> GetProjectChannelsAsync(Guid projectId, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default);
    Task<ChannelDto> CreateChannelAsync(CreateChannelDto request, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default);
    Task<ChannelDto?> UpdateChannelAsync(Guid id, UpdateChannelDto request, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default);
    Task<ChannelDto?> ArchiveChannelAsync(Guid id, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default);
    Task<ChannelMemberDto> AddMemberAsync(Guid channelId, AddChannelMemberDto request, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default);
    Task<bool> RemoveMemberAsync(Guid channelId, Guid memberUserId, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default);
    Task<ChannelDto> GetOrCreateDirectMessageChannelAsync(Guid actorUserId, string actorRole, Guid targetUserId, CancellationToken cancellationToken = default);
    Task MarkChannelAsReadAsync(Guid channelId, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default);
}