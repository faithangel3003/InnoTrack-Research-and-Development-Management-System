using System.Security.Cryptography;
using System.Text;
using InnoTrack.RDMS.Api.Application.Dtos.Auth;
using InnoTrack.RDMS.Api.Application.Interfaces.Services;
using Microsoft.Extensions.Caching.Memory;

namespace InnoTrack.RDMS.Api.Security.Captcha;

public sealed class LoginCaptchaService(IMemoryCache cache) : ILoginCaptchaService
{
    private const string CacheKeyPrefix = "login-captcha:";
    private const int ChallengeLength = 4;
    private static readonly TimeSpan ChallengeLifetime = TimeSpan.FromMinutes(5);

    public LoginCaptchaChallengeDto CreateChallenge(string? remoteIp)
    {
        var answer = GenerateAnswer();
        var challengeId = Guid.NewGuid().ToString("N");
        var expiresAtUtc = DateTime.UtcNow.Add(ChallengeLifetime);

        cache.Set(
            BuildCacheKey(challengeId),
            new LoginCaptchaEntry(HashAnswer(answer), NormalizeIp(remoteIp), expiresAtUtc),
            expiresAtUtc);

        return new LoginCaptchaChallengeDto
        {
            ChallengeId = challengeId,
            ImageDataUrl = BuildImageDataUrl(answer),
            ExpiresAtUtc = expiresAtUtc,
            AnswerLength = ChallengeLength,
        };
    }

    public Task ValidateAsync(string challengeId, string answer, string? remoteIp, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(challengeId))
        {
            throw new InvalidOperationException("Captcha challenge is missing. Please refresh the image and try again.");
        }

        if (string.IsNullOrWhiteSpace(answer))
        {
            throw new InvalidOperationException("Please enter the captcha code.");
        }

        var cacheKey = BuildCacheKey(challengeId.Trim());
        if (!cache.TryGetValue<LoginCaptchaEntry>(cacheKey, out var challenge) || challenge is null)
        {
            throw new InvalidOperationException("Captcha expired. Please refresh the image and try again.");
        }

        cache.Remove(cacheKey);

        var expectedIp = challenge.RemoteIp;
        var currentIp = NormalizeIp(remoteIp);
        if (!string.IsNullOrWhiteSpace(expectedIp) && !string.Equals(expectedIp, currentIp, StringComparison.Ordinal))
        {
            throw new InvalidOperationException("Captcha expired. Please refresh the image and try again.");
        }

        var normalizedAnswer = NormalizeAnswer(answer);
        var candidateHash = HashAnswer(normalizedAnswer);
        if (!CryptographicOperations.FixedTimeEquals(challenge.AnswerHash, candidateHash))
        {
            throw new InvalidOperationException("Captcha does not match. Please try the new image.");
        }

        return Task.CompletedTask;
    }

    private static string GenerateAnswer()
    {
        var digits = new char[ChallengeLength];
        for (var index = 0; index < digits.Length; index++)
        {
            digits[index] = (char)('0' + RandomNumberGenerator.GetInt32(0, 10));
        }

        return new string(digits);
    }

    private static string NormalizeAnswer(string answer)
    {
        var builder = new StringBuilder(answer.Length);
        foreach (var character in answer)
        {
            if (char.IsLetterOrDigit(character))
            {
                builder.Append(char.ToUpperInvariant(character));
            }
        }

        return builder.ToString();
    }

    private static string? NormalizeIp(string? remoteIp)
    {
        return string.IsNullOrWhiteSpace(remoteIp) ? null : remoteIp.Trim();
    }

    private static byte[] HashAnswer(string answer)
    {
        return SHA256.HashData(Encoding.UTF8.GetBytes(answer));
    }

    private static string BuildCacheKey(string challengeId)
    {
        return $"{CacheKeyPrefix}{challengeId}";
    }

    private static string BuildImageDataUrl(string answer)
    {
        var svg = BuildSvg(answer);
        return $"data:image/svg+xml;base64,{Convert.ToBase64String(Encoding.UTF8.GetBytes(svg))}";
    }

    private static string BuildSvg(string answer)
    {
        const int width = 150;
        const int height = 56;
        var builder = new StringBuilder();

        builder.AppendLine($"<svg xmlns='http://www.w3.org/2000/svg' width='{width}' height='{height}' viewBox='0 0 {width} {height}' role='img' aria-label='Login captcha'>");
        builder.AppendLine("  <defs>");
        builder.AppendLine("    <filter id='grain'>");
        builder.AppendLine("      <feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='1' stitchTiles='stitch' />");
        builder.AppendLine("      <feColorMatrix type='saturate' values='0' />");
        builder.AppendLine("      <feComponentTransfer><feFuncA type='table' tableValues='0 0.08' /></feComponentTransfer>");
        builder.AppendLine("    </filter>");
        builder.AppendLine("  </defs>");
        builder.AppendLine($"  <rect width='{width}' height='{height}' rx='10' fill='#f5f5f5' />");
        builder.AppendLine($"  <rect x='1' y='1' width='{width - 2}' height='{height - 2}' rx='9' fill='#fbfbfb' stroke='#d4d4d8' />");
        builder.AppendLine($"  <rect width='{width}' height='{height}' fill='#111827' filter='url(#grain)' opacity='0.12' />");

        for (var lineIndex = 0; lineIndex < 5; lineIndex++)
        {
            var x1 = RandomNumberGenerator.GetInt32(4, width / 2);
            var y1 = RandomNumberGenerator.GetInt32(8, height - 8);
            var x2 = RandomNumberGenerator.GetInt32(width / 2, width - 4);
            var y2 = RandomNumberGenerator.GetInt32(8, height - 8);
            var strokeWidth = RandomNumberGenerator.GetInt32(1, 3);
            builder.AppendLine($"  <path d='M{x1},{y1} C{x1 + 16},{RandomNumberGenerator.GetInt32(0, height)} {x2 - 16},{RandomNumberGenerator.GetInt32(0, height)} {x2},{y2}' fill='none' stroke='#a1a1aa' stroke-width='{strokeWidth}' opacity='0.6' />");
        }

        for (var dotIndex = 0; dotIndex < 18; dotIndex++)
        {
            var cx = RandomNumberGenerator.GetInt32(6, width - 6);
            var cy = RandomNumberGenerator.GetInt32(8, height - 8);
            var radius = RandomNumberGenerator.GetInt32(1, 3);
            builder.AppendLine($"  <circle cx='{cx}' cy='{cy}' r='{radius}' fill='#9ca3af' opacity='0.45' />");
        }

        for (var index = 0; index < answer.Length; index++)
        {
            var character = answer[index];
            var x = 20 + (index * 29) + RandomNumberGenerator.GetInt32(-2, 3);
            var y = 37 + RandomNumberGenerator.GetInt32(-4, 5);
            var rotation = RandomNumberGenerator.GetInt32(-18, 19);
            var fontSize = RandomNumberGenerator.GetInt32(26, 31);

            builder.AppendLine($"  <text x='{x + 1}' y='{y + 1}' fill='#d4d4d8' font-family='Courier New, monospace' font-size='{fontSize}' font-style='italic' font-weight='700' transform='rotate({rotation} {x} {y})'>{character}</text>");
            builder.AppendLine($"  <text x='{x}' y='{y}' fill='#111827' font-family='Courier New, monospace' font-size='{fontSize}' font-style='italic' font-weight='700' letter-spacing='2' transform='rotate({rotation} {x} {y})'>{character}</text>");
        }

        builder.AppendLine("</svg>");
        return builder.ToString();
    }

    private sealed record LoginCaptchaEntry(byte[] AnswerHash, string? RemoteIp, DateTime ExpiresAtUtc);
}