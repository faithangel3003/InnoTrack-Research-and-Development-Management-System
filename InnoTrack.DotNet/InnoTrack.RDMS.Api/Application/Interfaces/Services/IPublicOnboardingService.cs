using InnoTrack.RDMS.Api.Application.Dtos.Auth;

namespace InnoTrack.RDMS.Api.Application.Interfaces.Services;

public interface IPublicOnboardingService
{
    Task<PublicOnboardingCheckoutSessionResponseDto> CreateCheckoutSessionAsync(PublicOnboardingRequestDto request, string? ipAddress, string clientBaseUrl, CancellationToken cancellationToken = default);
    Task<PublicOnboardingCheckoutSessionResponseDto> RetryCheckoutSessionAsync(Guid pendingOnboardingId, RetryPublicOnboardingCheckoutRequestDto request, string? ipAddress, string clientBaseUrl, CancellationToken cancellationToken = default);
    Task<PublicOnboardingResponseDto> CompleteOnboardingAsync(Guid pendingOnboardingId, string? ipAddress, CancellationToken cancellationToken = default);
}