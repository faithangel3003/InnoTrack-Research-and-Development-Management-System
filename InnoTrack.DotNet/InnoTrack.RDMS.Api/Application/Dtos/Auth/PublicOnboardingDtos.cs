using System.ComponentModel.DataAnnotations;
using InnoTrack.RDMS.Api.Security.Password;
using InnoTrack.RDMS.Api.Security.Validation;

namespace InnoTrack.RDMS.Api.Application.Dtos.Auth;

public class PublicOnboardingRequestDto
{
    [Required]
    [StringLength(InputLimitsConstants.Name, MinimumLength = 2)]
    public string CompanyName { get; set; } = string.Empty;

    [Required]
    [StringLength(120, MinimumLength = 2)]
    public string Industry { get; set; } = string.Empty;

    [Required]
    [StringLength(InputLimitsConstants.Name, MinimumLength = 2)]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    [StringLength(InputLimitsConstants.Name, MinimumLength = 2)]
    public string LastName { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [MaxLength(InputLimitsConstants.Email)]
    public string Email { get; set; } = string.Empty;

    [StringLength(InputLimitsConstants.Phone)]
    public string? PhoneNumber { get; set; }

    [Required]
    [MinLength(InputLimitsConstants.PasswordMin)]
    [MaxLength(InputLimitsConstants.PasswordMax)]
    [PasswordPolicy]
    public string Password { get; set; } = string.Empty;

    [Required]
    public string PlanId { get; set; } = string.Empty;

    [Required]
    public string PaymentMethod { get; set; } = string.Empty;

    [Required]
    public string CaptchaToken { get; set; } = string.Empty;

    [MaxLength(128)]
    public string? CaptchaChallengeId { get; set; }
}

public class RetryPublicOnboardingCheckoutRequestDto
{
    [Required]
    public string PaymentMethod { get; set; } = string.Empty;

    [Required]
    public string CaptchaToken { get; set; } = string.Empty;

    [MaxLength(128)]
    public string? CaptchaChallengeId { get; set; }
}

public class PublicOnboardingCheckoutSessionResponseDto
{
    public Guid PendingOnboardingId { get; set; }
    public string CheckoutSessionId { get; set; } = string.Empty;
    public string CheckoutUrl { get; set; } = string.Empty;
}

public class CompletePublicOnboardingRequestDto
{
    [Required]
    public Guid PendingOnboardingId { get; set; }
}

public class PublicOnboardingResponseDto
{
    public Guid OrganizationId { get; set; }
    public Guid AdminUserId { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string AdminEmail { get; set; } = string.Empty;
    public string Plan { get; set; } = string.Empty;
    public string PaymentReference { get; set; } = string.Empty;
    public string ApprovalStatus { get; set; } = string.Empty;
}