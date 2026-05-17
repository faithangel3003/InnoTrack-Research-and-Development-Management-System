using System.Text.RegularExpressions;
using InnoTrack.RDMS.Api.Security.Validation;

namespace InnoTrack.RDMS.Api.Security.Password;

public sealed class PasswordPolicyValidationResult
{
    public bool IsValid => Errors.Count == 0;
    public List<string> Errors { get; } = new();
}

public static partial class PasswordPolicyValidator
{
    public static PasswordPolicyValidationResult Validate(string? password)
    {
        var result = new PasswordPolicyValidationResult();

        if (string.IsNullOrWhiteSpace(password))
        {
            result.Errors.Add("Password is required.");
            return result;
        }

        if (password.Length < InputLimitsConstants.PasswordMin)
        {
            result.Errors.Add($"Password must be at least {InputLimitsConstants.PasswordMin} characters long.");
        }

        if (password.Length > InputLimitsConstants.PasswordMax)
        {
            result.Errors.Add($"Password must not exceed {InputLimitsConstants.PasswordMax} characters.");
        }

        if (!UppercasePattern().IsMatch(password))
        {
            result.Errors.Add("Password must contain at least one uppercase letter.");
        }

        if (!LowercasePattern().IsMatch(password))
        {
            result.Errors.Add("Password must contain at least one lowercase letter.");
        }

        if (!DigitPattern().IsMatch(password))
        {
            result.Errors.Add("Password must contain at least one number.");
        }

        if (WhitespacePattern().IsMatch(password))
        {
            result.Errors.Add("Password must not contain whitespace characters.");
        }

        return result;
    }

    [GeneratedRegex("[A-Z]", RegexOptions.Compiled)]
    private static partial Regex UppercasePattern();

    [GeneratedRegex("[a-z]", RegexOptions.Compiled)]
    private static partial Regex LowercasePattern();

    [GeneratedRegex("[0-9]", RegexOptions.Compiled)]
    private static partial Regex DigitPattern();

    [GeneratedRegex("\\s", RegexOptions.Compiled)]
    private static partial Regex WhitespacePattern();
}