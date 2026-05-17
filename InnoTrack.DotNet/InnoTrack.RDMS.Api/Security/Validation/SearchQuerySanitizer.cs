using System.Text.Encodings.Web;
using System.Text.RegularExpressions;

namespace InnoTrack.RDMS.Api.Security.Validation;

public static partial class SearchQuerySanitizer
{
    public static string Sanitize(string? query)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return string.Empty;
        }

        var sanitized = SqlMetacharactersPattern().Replace(query, string.Empty).Trim();
        if (sanitized.Length > InputLimitsConstants.SearchQuery)
        {
            sanitized = sanitized[..InputLimitsConstants.SearchQuery];
        }

        return HtmlEncoder.Default.Encode(sanitized);
    }

    [GeneratedRegex("('|\"|;|--|/\\*|\\*/|xp_|sp_)", RegexOptions.IgnoreCase | RegexOptions.Compiled)]
    private static partial Regex SqlMetacharactersPattern();
}