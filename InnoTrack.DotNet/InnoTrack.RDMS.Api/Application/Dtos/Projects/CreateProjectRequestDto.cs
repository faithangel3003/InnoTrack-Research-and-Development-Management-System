namespace InnoTrack.RDMS.Api.Application.Dtos.Projects;

public class CreateProjectRequestDto
{
    public Guid OrganizationId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Objective { get; set; }
    public string Priority { get; set; } = "Medium";
    public string LifecycleStage { get; set; } = "Ideation";
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
}
