namespace InnoTrack.RDMS.Api.Application.Interfaces.Services;

public interface IRecaptchaVerificationService
{
    Task ValidateAsync(string token, string? remoteIp, CancellationToken cancellationToken = default);
}
