namespace InnoTrack.RDMS.Api.Application.Dtos.Collaboration;

public class NotificationSummaryDto
{
    public int TotalUnreadCount { get; set; }
    public Dictionary<string, int> CountsByType { get; set; } = new(StringComparer.OrdinalIgnoreCase);
}