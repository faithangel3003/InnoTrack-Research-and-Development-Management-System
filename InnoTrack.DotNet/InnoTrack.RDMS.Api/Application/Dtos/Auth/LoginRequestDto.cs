using System.ComponentModel.DataAnnotations;
using InnoTrack.RDMS.Api.Security.Validation;

namespace InnoTrack.RDMS.Api.Application.Dtos.Auth;

public class LoginRequestDto
{
    [Required]
    [EmailAddress]
    [MaxLength(InputLimitsConstants.Email)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MaxLength(InputLimitsConstants.PasswordMax)]
    public string Password { get; set; } = string.Empty;

    [Required]
    public string CaptchaToken { get; set; } = string.Empty;

    [MaxLength(128)]
    public string? CaptchaChallengeId { get; set; }
}
