using System.ComponentModel.DataAnnotations;
using InnoTrack.RDMS.Api.Security.Password;
using InnoTrack.RDMS.Api.Security.Validation;

namespace InnoTrack.RDMS.Api.Application.Dtos.Users;

public class CreateUserDto
{
    [Required]
    [MaxLength(InputLimitsConstants.Name)]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    [MaxLength(InputLimitsConstants.Name)]
    public string LastName { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [MaxLength(InputLimitsConstants.Email)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MinLength(InputLimitsConstants.PasswordMin)]
    [MaxLength(InputLimitsConstants.PasswordMax)]
    [PasswordPolicy]
    public string Password { get; set; } = string.Empty;

    [Range(1, 4)]
    public int RoleId { get; set; }

    public Guid? OrganizationId { get; set; }
    public Guid? TeamId { get; set; }
}
