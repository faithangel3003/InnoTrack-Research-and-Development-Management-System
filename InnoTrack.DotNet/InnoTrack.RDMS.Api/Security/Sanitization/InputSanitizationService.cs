using System.Collections;
using System.Reflection;
using System.Text.Encodings.Web;
using System.Text.RegularExpressions;
using Ganss.Xss;
using InnoTrack.RDMS.Api.Security.Validation;
using Microsoft.AspNetCore.Http;

namespace InnoTrack.RDMS.Api.Security.Sanitization;

public sealed partial class InputSanitizationService : IInputSanitizationService
{
    private readonly HtmlSanitizer sanitizer = CreateSanitizer();

    public string SanitizeHtml(string input)
    {
        if (string.IsNullOrWhiteSpace(input))
        {
            return string.Empty;
        }

        var sanitized = sanitizer.Sanitize(input);
        return HtmlEncoder.Default.Encode(sanitized);
    }

    public string SanitizePlainText(string input)
    {
        if (string.IsNullOrWhiteSpace(input))
        {
            return string.Empty;
        }

        var withoutNullBytes = input.Replace("\0", string.Empty).Trim();
        var withoutControlChars = ControlCharactersPattern().Replace(withoutNullBytes, string.Empty);
        return HtmlEncoder.Default.Encode(withoutControlChars);
    }

    public string SanitizeFileName(string fileName)
    {
        if (string.IsNullOrWhiteSpace(fileName))
        {
            return string.Empty;
        }

        var safeName = Path.GetFileName(fileName);
        safeName = UnsafeFileNamePattern().Replace(safeName, "_");
        return safeName.Length <= InputLimitsConstants.FileName ? safeName : safeName[..InputLimitsConstants.FileName];
    }

    public T SanitizeDto<T>(T dto)
    {
        if (dto is null)
        {
            return dto!;
        }

        var properties = dto.GetType()
            .GetProperties(BindingFlags.Instance | BindingFlags.Public)
            .Where(property => property.CanRead && property.CanWrite && property.GetIndexParameters().Length == 0);

        foreach (var property in properties)
        {
            if (IsSensitiveProperty(property.Name))
            {
                continue;
            }

            if (typeof(IFormFile).IsAssignableFrom(property.PropertyType))
            {
                continue;
            }

            if (property.PropertyType == typeof(string))
            {
                var value = property.GetValue(dto) as string;
                if (value is not null)
                {
                    property.SetValue(dto, SanitizePlainText(value));
                }

                continue;
            }

            if (typeof(IEnumerable).IsAssignableFrom(property.PropertyType))
            {
                if (property.GetValue(dto) is IList list)
                {
                    for (var index = 0; index < list.Count; index++)
                    {
                        switch (list[index])
                        {
                            case string item:
                                list[index] = SanitizePlainText(item);
                                break;
                            case not null and not byte[] and not IFormFile:
                                SanitizeDto(list[index]);
                                break;
                        }
                    }
                }

                continue;
            }

            if (!property.PropertyType.IsClass || property.PropertyType == typeof(byte[]))
            {
                continue;
            }

            var nestedValue = property.GetValue(dto);
            if (nestedValue is not null)
            {
                SanitizeDto(nestedValue);
            }
        }

        return dto;
    }

    private static HtmlSanitizer CreateSanitizer()
    {
        var sanitizer = new HtmlSanitizer();
        sanitizer.AllowedTags.Clear();
        sanitizer.AllowedAttributes.Clear();
        sanitizer.AllowedSchemes.Clear();
        return sanitizer;
    }

    private static bool IsSensitiveProperty(string propertyName)
    {
        return propertyName.Contains("password", StringComparison.OrdinalIgnoreCase)
            || propertyName.EndsWith("token", StringComparison.OrdinalIgnoreCase)
            || propertyName.Contains("verification", StringComparison.OrdinalIgnoreCase);
    }

    [GeneratedRegex("[\\p{Cc}&&[^\\r\\n\\t]]", RegexOptions.Compiled)]
    private static partial Regex ControlCharactersPattern();

    [GeneratedRegex("[^a-zA-Z0-9._-]", RegexOptions.Compiled)]
    private static partial Regex UnsafeFileNamePattern();
}