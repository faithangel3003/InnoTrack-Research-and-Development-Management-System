using InnoTrack.RDMS.Api.Application.Dtos.Auth;
using InnoTrack.RDMS.Api.Domain.Entities;

namespace InnoTrack.RDMS.Api.Application.Interfaces.Services;

public interface IJwtTokenService
{
    AuthResponseDto CreateToken(AppUser user, IEnumerable<string> roles);
}
