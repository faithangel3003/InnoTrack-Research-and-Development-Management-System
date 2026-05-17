using System.ComponentModel.DataAnnotations;
using InnoTrack.RDMS.Api.Security.Validation;

namespace InnoTrack.RDMS.Api.Application.Dtos.Security;

public class RequestUnmaskDto
{
    [Required]
    public Guid TargetUserId { get; set; }

    [Required]
    [MaxLength(64)]
    public string FieldName { get; set; } = string.Empty;

    [Required]
    [MinLength(InputLimitsConstants.PasswordMin)]
    [MaxLength(InputLimitsConstants.PasswordMax)]
    public string Password { get; set; } = string.Empty;
}

public class VerifyUnmaskDto
{
    [Required]
    [MaxLength(12)]
    public string Token { get; set; } = string.Empty;

    [Required]
    public Guid TargetUserId { get; set; }

    [Required]
    [MaxLength(64)]
    public string FieldName { get; set; } = string.Empty;
}

public class UnmaskTokenResponseDto
{
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
}

public class UnmaskValueResponseDto
{
    public string UnmaskedValue { get; set; } = string.Empty;
}

public class UnmaskLogDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid TargetUserId { get; set; }
    public string FieldName { get; set; } = string.Empty;
    public string? IPAddress { get; set; }
    public string? UserAgent { get; set; }
    public DateTime Timestamp { get; set; }
}