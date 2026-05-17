namespace InnoTrack.RDMS.Api.Domain.Entities;

public class FailedLoginAttempt : BaseEntity
{
    public string Email { get; set; } = string.Empty;
    public string? IPAddress { get; set; }
    public DateTime AttemptedAt { get; set; }
    public bool IsAccountLock { get; set; }
    public DateTime? LockExpiresAt { get; set; }
}