namespace InnoTrack.RDMS.Blazor.Models;

public class ProjectItem
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public Guid CreatedByUserId { get; set; }
    public Guid OrganizationId { get; set; }
    public int MemberCount { get; set; }
    public int TotalTasks { get; set; }
    public int CompletedTasks { get; set; }
}

public class CreateProjectRequestModel
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Priority { get; set; } = "Medium";
    public DateTime StartDate { get; set; } = DateTime.Today;
    public DateTime EndDate { get; set; } = DateTime.Today.AddDays(30);
    public Guid OrganizationId { get; set; }
}

public class UpdateProjectRequestModel : CreateProjectRequestModel
{
}

public class ChangeProjectStatusRequestModel
{
    public string Status { get; set; } = string.Empty;
    public string? Remarks { get; set; }
}

public class ProjectSummaryItem
{
    public Guid ProjectId { get; set; }
    public int TotalTasks { get; set; }
    public int CompletedTasks { get; set; }
    public int OverdueTasks { get; set; }
    public int MemberCount { get; set; }
    public double CompletionRate { get; set; }
}

public class ProjectTaskItem
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid AssignedToUserId { get; set; }
    public Guid AssignedByUserId { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public DateTime DueDate { get; set; }
    public DateTime? CompletedAt { get; set; }
}

public class CreateTaskRequestModel
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid AssignedToUserId { get; set; }
    public string Priority { get; set; } = "Medium";
    public DateTime DueDate { get; set; } = DateTime.Today.AddDays(7);
}

public class UpdateTaskRequestModel : CreateTaskRequestModel
{
}

public class UpdateTaskStatusRequestModel
{
    public string Status { get; set; } = "Todo";
}

public class MilestoneItem
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime DueDate { get; set; }
    public bool IsCompleted { get; set; }
    public DateTime? CompletedAt { get; set; }
}

public class CreateMilestoneRequestModel
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime DueDate { get; set; } = DateTime.Today.AddDays(14);
}

public class TaskCommentItem
{
    public Guid Id { get; set; }
    public Guid TaskId { get; set; }
    public Guid UserId { get; set; }
    public string Comment { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class CreateTaskCommentRequestModel
{
    public string Comment { get; set; } = string.Empty;
}

public class ProjectMemberItem
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public Guid UserId { get; set; }
    public string MemberRole { get; set; } = string.Empty;
    public DateTime JoinedAt { get; set; }
}

public class AddProjectMemberRequestModel
{
    public Guid UserId { get; set; }
    public string MemberRole { get; set; } = "Contributor";
}
