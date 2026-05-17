using System.Net;
using System.Net.Mail;
using System.Security.Cryptography;
using InnoTrack.RDMS.Api.Security.Encryption;
using InnoTrack.RDMS.Api.Security.Masking;
using Microsoft.Extensions.Caching.Memory;

namespace InnoTrack.RDMS.Api.Security.Recovery;

public sealed class AccountRecoveryOtpService(
    IMemoryCache cache,
    IConfiguration configuration,
    IEncryptionService encryptionService,
    IDataMaskingService dataMaskingService,
    ILogger<AccountRecoveryOtpService> logger) : IAccountRecoveryOtpService
{
    private const int CodeLength = 6;
    private const int MaxVerificationAttempts = 5;
    private readonly TimeSpan _otpLifetime = TimeSpan.FromMinutes(Math.Clamp(configuration.GetValue<int?>("AccountRecovery:OtpExpiryMinutes") ?? 10, 5, 30));

    public async Task<AccountRecoveryOtpChallenge> IssueOtpAsync(string email, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = NormalizeEmail(email);
        var code = GenerateCode();
        var expiresAtUtc = DateTime.UtcNow.Add(_otpLifetime);

        cache.Set(GetCacheKey(normalizedEmail), new RecoveryOtpEntry
        {
            EncryptedCode = encryptionService.Encrypt(code),
            ExpiresAtUtc = expiresAtUtc,
            FailedAttempts = 0,
        }, expiresAtUtc);

        await SendEmailAsync(normalizedEmail, code, expiresAtUtc, cancellationToken);

        return new AccountRecoveryOtpChallenge(dataMaskingService.MaskEmail(normalizedEmail), expiresAtUtc);
    }

    public Task<bool> VerifyOtpAsync(string email, string otpCode, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var normalizedEmail = NormalizeEmail(email);
        var normalizedCode = otpCode.Trim();
        if (normalizedCode.Length != CodeLength)
        {
            return Task.FromResult(false);
        }

        if (!cache.TryGetValue<RecoveryOtpEntry>(GetCacheKey(normalizedEmail), out var entry) || entry is null)
        {
            return Task.FromResult(false);
        }

        if (entry.ExpiresAtUtc <= DateTime.UtcNow)
        {
            cache.Remove(GetCacheKey(normalizedEmail));
            return Task.FromResult(false);
        }

        var expectedCode = encryptionService.Decrypt(entry.EncryptedCode);
        var isMatch = string.Equals(expectedCode, normalizedCode, StringComparison.Ordinal);
        if (isMatch)
        {
            cache.Remove(GetCacheKey(normalizedEmail));
            return Task.FromResult(true);
        }

        entry.FailedAttempts++;
        if (entry.FailedAttempts >= MaxVerificationAttempts)
        {
            cache.Remove(GetCacheKey(normalizedEmail));
        }
        else
        {
            cache.Set(GetCacheKey(normalizedEmail), entry, entry.ExpiresAtUtc);
        }

        return Task.FromResult(false);
    }

    private async Task SendEmailAsync(string email, string code, DateTime expiresAtUtc, CancellationToken cancellationToken)
    {
        var host = configuration["Smtp:Host"]?.Trim();
        var port = configuration.GetValue<int?>("Smtp:Port") ?? 587;
        var username = configuration["Smtp:Username"]?.Trim();
        var password = configuration["Smtp:Password"];
        var fromEmail = configuration["Smtp:FromEmail"]?.Trim();
        var fromName = configuration["Smtp:FromName"]?.Trim();
        var enableSsl = configuration.GetValue<bool?>("Smtp:EnableSsl") ?? true;

        if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(fromEmail))
        {
            logger.LogError("Account recovery OTP email could not be sent because SMTP is not configured.");
            throw new InvalidOperationException("Password recovery email is not configured. Please contact support.");
        }

        using var message = new MailMessage
        {
            From = string.IsNullOrWhiteSpace(fromName)
                ? new MailAddress(fromEmail)
                : new MailAddress(fromEmail, fromName),
            Subject = "InnoTrack Password Reset OTP",
            Body = $"Your InnoTrack password reset code is {code}. It expires at {expiresAtUtc:u}. If you did not request this reset, you can ignore this email.",
            IsBodyHtml = false,
        };

        message.To.Add(new MailAddress(email));

        using var smtpClient = new SmtpClient(host, port)
        {
            EnableSsl = enableSsl,
            DeliveryMethod = SmtpDeliveryMethod.Network,
        };

        if (!string.IsNullOrWhiteSpace(username))
        {
            smtpClient.Credentials = new NetworkCredential(username, password ?? string.Empty);
        }

        cancellationToken.ThrowIfCancellationRequested();
        await smtpClient.SendMailAsync(message, cancellationToken);
    }

    private static string NormalizeEmail(string email)
    {
        return email.Trim().ToLowerInvariant();
    }

    private static string GenerateCode()
    {
        var value = RandomNumberGenerator.GetInt32(0, 1_000_000);
        return value.ToString($"D{CodeLength}");
    }

    private static string GetCacheKey(string email)
    {
        return $"account-recovery-otp:{email}";
    }

    private sealed class RecoveryOtpEntry
    {
        public string EncryptedCode { get; set; } = string.Empty;
        public DateTime ExpiresAtUtc { get; set; }
        public int FailedAttempts { get; set; }
    }
}