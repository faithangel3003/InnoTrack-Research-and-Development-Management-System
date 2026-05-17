namespace InnoTrack.RDMS.Api.Application.Dtos.Projects;

public class ProjectSummaryDto
{
    public Guid ProjectId { get; set; }
    public int TotalTasks { get; set; }
    public int CompletedTasks { get; set; }
    public int OverdueTasks { get; set; }
    public int MemberCount { get; set; }
    public double CompletionRate { get; set; }
}
