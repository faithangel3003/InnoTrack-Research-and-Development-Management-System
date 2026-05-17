using System.Text.RegularExpressions;

namespace InnoTrack.RDMS.Api.Security.Masking;

public sealed class DataMaskingService : IDataMaskingService
{
    public string MaskEmail(string email)
    {
        if (string.IsNullOrWhiteSpace(email) || !email.Contains('@'))
        {
            return MaskGeneric(email, 2);
        }

        var parts = email.Split('@', 2);
        return $"{parts[0][0]}***@{parts[1]}";
    }

    public string MaskPhoneNumber(string phone)
    {
        if (string.IsNullOrWhiteSpace(phone))
        {
            return string.Empty;
        }

        var digits = new string(phone.Where(char.IsDigit).ToArray());
        if (digits.Length <= 4)
        {
            return $"--{digits}";
        }

        return $"--{digits[^4..]}";
    }

    public string MaskSssNumber(string sss)
    {
        if (string.IsNullOrWhiteSpace(sss))
        {
            return string.Empty;
        }

        var digits = new string(sss.Where(char.IsDigit).ToArray());
        if (digits.Length < 4)
        {
            return MaskGeneric(sss, digits.Length);
        }

        return $"***-**-{digits[^4..]}";
    }

    public string MaskAddress(string address)
    {
        if (string.IsNullOrWhiteSpace(address))
        {
            return string.Empty;
        }

        var parts = address.Split(',', 2, StringSplitOptions.TrimEntries);
        var streetTokens = parts[0].Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (streetTokens.Length == 0)
        {
            return address;
        }

        var maskedStreet = string.Join(' ', streetTokens.Select((token, index) => index == streetTokens.Length - 1 ? token : "***"));
        return parts.Length == 1 ? maskedStreet : $"{maskedStreet}, {parts[1]}";
    }

    public string MaskGeneric(string value, int visibleChars)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        var visible = Math.Max(0, Math.Min(visibleChars, value.Length));
        var maskedLength = Math.Max(0, value.Length - visible);
        return string.Concat(new string('*', maskedLength), visible == 0 ? string.Empty : value[^visible..]);
    }
}