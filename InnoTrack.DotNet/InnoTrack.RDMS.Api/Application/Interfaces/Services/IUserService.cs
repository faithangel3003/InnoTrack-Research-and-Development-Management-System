using InnoTrack.RDMS.Api.Application.Dtos.Users;

namespace InnoTrack.RDMS.Api.Application.Interfaces.Services;

public interface IUserService
{
    Task<List<UserDto>> GetAllUsersAsync(Guid actorUserId, string actorRole, CancellationToken cancellationToken = default);
    Task<UserDto?> GetUserByIdAsync(Guid id, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default);
    Task<UserDto> CreateUserAsync(CreateUserDto request, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default);
    Task<UserDto?> UpdateUserAsync(Guid id, UpdateUserDto request, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default);
    Task<bool> DeactivateUserAsync(Guid id, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default);
    Task<bool> ChangeRoleAsync(Guid id, int roleId, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default);
}
