using System.Net;
using System.Net.Mail;
using System.Net.Sockets;
using System.Linq;
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
        var cacheKey = GetCacheKey(normalizedEmail);

        cache.Set(cacheKey, new RecoveryOtpEntry
        {
            EncryptedCode = encryptionService.Encrypt(code),
            ExpiresAtUtc = expiresAtUtc,
            FailedAttempts = 0,
        }, expiresAtUtc);

        try
        {
            await SendEmailAsync(normalizedEmail, code, expiresAtUtc, cancellationToken);
        }
        catch
        {
            cache.Remove(cacheKey);
            throw;
        }

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
        var timeoutMs = configuration.GetValue<int?>("Smtp:TimeoutMs") ?? 10_000;

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

        var portCandidates = BuildPortCandidates(port);
        var hostCandidates = BuildHostCandidates(host);
        Exception? lastConnectionException = null;

        foreach (var hostCandidate in hostCandidates)
        {
            foreach (var portCandidate in portCandidates)
            {
                var useSsl = portCandidate == 465 || enableSsl;

                try
                {
                    using var smtpClient = new SmtpClient(hostCandidate, portCandidate)
                    {
                        EnableSsl = useSsl,
                        DeliveryMethod = SmtpDeliveryMethod.Network,
                        Timeout = timeoutMs,
                        UseDefaultCredentials = false,
                    };

                    if (!string.IsNullOrWhiteSpace(username))
                    {
                        smtpClient.Credentials = new NetworkCredential(username, password ?? string.Empty);
                    }

                    cancellationToken.ThrowIfCancellationRequested();
                    await smtpClient.SendMailAsync(message, cancellationToken);
                    return;
                }
                catch (SmtpException ex) when (IsConnectionFailure(ex))
                {
                    lastConnectionException = ex;
                    logger.LogWarning(ex, "SMTP connection failed for host {Host} on port {Port}.", hostCandidate, portCandidate);
                }
                catch (SmtpException ex)
                {
                    logger.LogError(ex, "SMTP send failed for account recovery email.");
                    throw new InvalidOperationException("We could not send the recovery code. Please try again later.");
                }
            }
        }

        if (lastConnectionException is not null)
        {
            logger.LogError(lastConnectionException, "SMTP connection refused for host {Host} with ports {Ports}.", host, string.Join(",", portCandidates));
        }

        throw new InvalidOperationException("We could not connect to the email server. Please contact support.");
    }

    private static IReadOnlyList<int> BuildPortCandidates(int primaryPort)
    {
        var ports = new List<int>();
        if (IsValidPort(primaryPort))
        {
            ports.Add(primaryPort);
        }

        if (primaryPort == 587)
        {
            ports.Add(465);
        }
        else if (primaryPort == 465)
        {
            ports.Add(587);
        }

        return ports.Distinct().ToArray();
    }

    private static IReadOnlyList<string> BuildHostCandidates(string host)
    {
        var hosts = new List<string> { host };

        if (!IPAddress.TryParse(host, out _))
        {
            try
            {
                var ipv4 = Dns.GetHostAddresses(host)
                    .FirstOrDefault(address => address.AddressFamily == AddressFamily.InterNetwork);

                if (ipv4 is not null)
                {
                    hosts.Add(ipv4.ToString());
                }
            }
            catch (SocketException)
            {
                // DNS failures should not prevent trying the original hostname.
            }
        }

        return hosts.Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
    }

    private static bool IsConnectionFailure(SmtpException exception)
    {
        if (exception.InnerException is SocketException socketException)
        {
            return socketException.SocketErrorCode is SocketError.ConnectionRefused
                or SocketError.TimedOut
                or SocketError.HostNotFound
                or SocketError.NetworkDown
                or SocketError.NetworkUnreachable;
        }

        return false;
    }

    private static bool IsValidPort(int port)
    {
        return port is > 0 and <= 65_535;
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