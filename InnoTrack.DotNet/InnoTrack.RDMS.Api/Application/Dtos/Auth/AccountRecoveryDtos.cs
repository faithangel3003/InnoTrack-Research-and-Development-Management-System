using System.ComponentModel.DataAnnotations;
using InnoTrack.RDMS.Api.Security.Validation;

namespace InnoTrack.RDMS.Api.Application.Dtos.Auth;

public class CurrentUserProfileDto
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public Guid? OrganizationId { get; set; }
    public bool MustChangePassword { get; set; }
    public List<string> Roles { get; set; } = new();
}

public class UpdateProfileRequestDto
{
    [Required]
    [StringLength(InputLimitsConstants.Name, MinimumLength = 2)]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    [StringLength(InputLimitsConstants.Name, MinimumLength = 2)]
    public string LastName { get; set; } = string.Empty;

    [StringLength(InputLimitsConstants.Phone)]
    [RegularExpression(@"^$|^\d{7,20}$", ErrorMessage = "Enter a valid phone number.")]
    public string? Phone { get; set; }
}

public class SecurityQuestionStateDto
{
    public bool HasSecurityQuestion { get; set; }
    public string? Question { get; set; }
}

public class UpdateSecurityQuestionRequestDto
{
    [Required]
    [StringLength(255, MinimumLength = 5)]
    public string Question { get; set; } = string.Empty;

    [Required]
    [StringLength(255, MinimumLength = 2)]
    public string Answer { get; set; } = string.Empty;

    [Required]
    [StringLength(255, MinimumLength = 2)]
    public string ConfirmAnswer { get; set; } = string.Empty;
}

public class ForgotPasswordQuestionRequestDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
}

public class ForgotPasswordQuestionResponseDto
{
    public string Email { get; set; } = string.Empty;
    public string RecoveryMethod { get; set; } = "SecurityQuestion";
    public string? Question { get; set; }
    public bool OtpSent { get; set; }
    public string? DeliveryHint { get; set; }
    public DateTime? OtpExpiresAtUtc { get; set; }
}

public class ForgotPasswordResetRequestDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [StringLength(255, MinimumLength = 2)]
    public string? Answer { get; set; }

    [StringLength(6, MinimumLength = 6)]
    public string? OtpCode { get; set; }

    [Required]
    [StringLength(128, MinimumLength = 8)]
    public string NewPassword { get; set; } = string.Empty;

    [Required]
    [StringLength(128, MinimumLength = 8)]
    public string ConfirmNewPassword { get; set; } = string.Empty;
}