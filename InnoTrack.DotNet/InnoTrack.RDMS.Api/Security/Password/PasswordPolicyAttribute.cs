using System.ComponentModel.DataAnnotations;

namespace InnoTrack.RDMS.Api.Security.Password;

[AttributeUsage(AttributeTargets.Property | AttributeTargets.Field | AttributeTargets.Parameter)]
public sealed class PasswordPolicyAttribute : ValidationAttribute
{
    protected override ValidationResult? IsValid(object? value, ValidationContext validationContext)
    {
        if (value is null || string.IsNullOrWhiteSpace(value as string))
        {
            return ValidationResult.Success;
        }

        var result = PasswordPolicyValidator.Validate(value as string);
        if (result.IsValid)
        {
            return ValidationResult.Success;
        }

        return new ValidationResult(string.Join(" ", result.Errors));
    }
}