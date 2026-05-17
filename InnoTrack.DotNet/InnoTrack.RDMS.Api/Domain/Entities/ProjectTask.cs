using InnoTrack.RDMS.Api.Domain.Enums;

namespace InnoTrack.RDMS.Api.Domain.Entities;

public class ProjectTask : BaseEntity
{
    public Guid ProjectId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid AssignedToUserId { get; set; }
    public Guid AssignedByUserId { get; set; }
    public InnoTrack.RDMS.Api.Domain.Enums.TaskStatus Status { get; set; } = InnoTrack.RDMS.Api.Domain.Enums.TaskStatus.Todo;
    public TaskPriority Priority { get; set; } = TaskPriority.Medium;
    public DateTime DueDate { get; set; }
    public DateTime? CompletedAt { get; set; }

    public Project Project { get; set; } = null!;
    public AppUser AssignedToUser { get; set; } = null!;
    public AppUser AssignedByUser { get; set; } = null!;
    public ICollection<TaskComment> Comments { get; set; } = new List<TaskComment>();
}
