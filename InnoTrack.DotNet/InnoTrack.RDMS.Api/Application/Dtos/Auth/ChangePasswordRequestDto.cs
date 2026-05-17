using System.ComponentModel.DataAnnotations;
using InnoTrack.RDMS.Api.Security.Password;
using InnoTrack.RDMS.Api.Security.Validation;

namespace InnoTrack.RDMS.Api.Application.Dtos.Auth;

public class ChangePasswordRequestDto
{
    [Required]
    [MaxLength(InputLimitsConstants.PasswordMax)]
    public string CurrentPassword { get; set; } = string.Empty;

    [Required]
    [MinLength(InputLimitsConstants.PasswordMin)]
    [MaxLength(InputLimitsConstants.PasswordMax)]
    [PasswordPolicy]
    public string NewPassword { get; set; } = string.Empty;
}