namespace InnoTrack.RDMS.Api.Security.Recovery;

public interface IAccountRecoveryOtpService
{
    Task<AccountRecoveryOtpChallenge> IssueOtpAsync(string email, CancellationToken cancellationToken = default);
    Task<bool> VerifyOtpAsync(string email, string otpCode, CancellationToken cancellationToken = default);
}

public sealed record AccountRecoveryOtpChallenge(string MaskedDestination, DateTime ExpiresAtUtc);