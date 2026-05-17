namespace InnoTrack.RDMS.Api.Domain.Entities;

public class UnmaskRequest : BaseEntity
{
    public Guid RequestedByUserId { get; set; }
    public Guid TargetUserId { get; set; }
    public string FieldName { get; set; } = string.Empty;
    public string VerificationToken { get; set; } = string.Empty;
    public DateTime TokenExpiry { get; set; }
    public bool IsUsed { get; set; }

    public AppUser RequestedByUser { get; set; } = null!;
    public AppUser TargetUser { get; set; } = null!;
}