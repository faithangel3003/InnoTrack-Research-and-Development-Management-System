namespace InnoTrack.RDMS.Api.Domain.Enums;

public enum SecurityEventType
{
    UnauthorizedAccess,
    InvalidToken,
    BruteForceDetected,
    SuspiciousActivity,
    ConfigAccessAttempt,
    PrivilegeEscalation,
    RateLimitExceeded,
    OversizedRequest,
    AdminReAuthenticationFailed,
    DataUnmaskRequested,
    DataUnmasked
}