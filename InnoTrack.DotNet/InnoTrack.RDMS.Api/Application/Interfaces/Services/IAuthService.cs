using InnoTrack.RDMS.Api.Application.Dtos.Auth;

namespace InnoTrack.RDMS.Api.Application.Interfaces.Services;

public interface IAuthService
{
    Task ValidateCredentialsAsync(LoginPrecheckRequestDto request, string? ipAddress, string? userAgent, CancellationToken cancellationToken = default);
    Task<AuthResponseDto> LoginAsync(LoginRequestDto request, string? ipAddress, string? userAgent, CancellationToken cancellationToken = default);
    Task<CurrentUserProfileDto?> GetCurrentUserAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<CurrentUserProfileDto?> UpdateProfileAsync(Guid userId, UpdateProfileRequestDto request, string? ipAddress, CancellationToken cancellationToken = default);
    Task<SecurityQuestionStateDto> GetSecurityQuestionAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<SecurityQuestionStateDto> UpdateSecurityQuestionAsync(Guid userId, UpdateSecurityQuestionRequestDto request, string? ipAddress, string? userAgent, CancellationToken cancellationToken = default);
    Task<ForgotPasswordQuestionResponseDto> GetForgotPasswordQuestionAsync(ForgotPasswordQuestionRequestDto request, CancellationToken cancellationToken = default);
    Task ResetPasswordWithSecurityQuestionAsync(ForgotPasswordResetRequestDto request, string? ipAddress, string? userAgent, CancellationToken cancellationToken = default);
    Task ChangePasswordAsync(Guid userId, ChangePasswordRequestDto request, string? ipAddress, string? userAgent, CancellationToken cancellationToken = default);
    Task LogoutAsync(Guid userId, string? ipAddress, string? userAgent, CancellationToken cancellationToken = default);
    string HashPassword(string password);
    bool ValidateToken(string token);
}
