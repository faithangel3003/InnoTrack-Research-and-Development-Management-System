using InnoTrack.RDMS.Api.Application.Dtos.Collaboration;

namespace InnoTrack.RDMS.Api.Application.Interfaces.Services;

public interface IMessageReactionService
{
    Task<List<MessageReactionDto>> GetReactionsByMessageAsync(Guid messageId, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default);
    Task<List<MessageReactionDto>> AddReactionAsync(Guid messageId, AddReactionDto request, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default);
    Task<List<MessageReactionDto>> RemoveReactionAsync(Guid messageId, string emoji, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default);
}