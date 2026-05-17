using InnoTrack.RDMS.Api.Application.Dtos.Auth;

namespace InnoTrack.RDMS.Api.Application.Interfaces.Services;

public interface ILoginCaptchaService
{
    LoginCaptchaChallengeDto CreateChallenge(string? remoteIp);

    Task ValidateAsync(string challengeId, string answer, string? remoteIp, CancellationToken cancellationToken = default);
}