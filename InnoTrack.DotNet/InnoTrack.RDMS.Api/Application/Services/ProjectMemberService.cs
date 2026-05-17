using InnoTrack.RDMS.Api.Application.Dtos.Members;
using InnoTrack.RDMS.Api.Application.Interfaces.Repositories;
using InnoTrack.RDMS.Api.Application.Interfaces.Services;
using InnoTrack.RDMS.Api.Domain.Entities;
using InnoTrack.RDMS.Api.Domain.Enums;
using InnoTrack.RDMS.Api.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace InnoTrack.RDMS.Api.Application.Services;

public class ProjectMemberService(
    IProjectMemberRepository projectMemberRepository,
    IProjectRepository projectRepository,
    IAuditLogService auditLogService,
    AppDbContext dbContext) : IProjectMemberService
{
    public async Task<List<ProjectMemberDto>> GetMembersAsync(Guid projectId, Guid actorUserId, string actorRole, CancellationToken cancellationToken = default)
    {
        await EnsureCanReadProject(projectId, actorUserId, actorRole, cancellationToken);
        var members = await projectMemberRepository.GetByProjectAsync(projectId, cancellationToken);
        return members.Select(Map).ToList();
    }

    public async Task<ProjectMemberDto> AddMemberAsync(Guid projectId, AddProjectMemberDto request, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var project = await EnsureCanManageProject(projectId, actorUserId, actorRole, cancellationToken);

        var targetUser = await dbContext.Users
            .FirstOrDefaultAsync(x => x.Id == request.UserId && x.OrganizationId == project.OrganizationId && x.IsActive, cancellationToken)
            ?? throw new InvalidOperationException("User is not active in this organization");

        var existing = await projectMemberRepository.GetByProjectAndUserAsync(projectId, request.UserId, cancellationToken);
        if (existing is not null)
        {
            throw new InvalidOperationException("User is already a project member");
        }

        var member = new ProjectMember
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            UserId = request.UserId,
            MemberRole = ParseMemberRole(request.MemberRole),
            JoinedAt = DateTime.UtcNow
        };

        await projectMemberRepository.AddAsync(member, cancellationToken);
        await projectMemberRepository.SaveChangesAsync(cancellationToken);

        await auditLogService.LogActionAsync(targetUser.Id, actorUserId, project.OrganizationId, "project.member.add", "project_members", member.Id, "info", ipAddress, cancellationToken);

        return Map(member);
    }

    public async Task<bool> RemoveMemberAsync(Guid projectId, Guid userId, Guid actorUserId, string actorRole, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var project = await EnsureCanManageProject(projectId, actorUserId, actorRole, cancellationToken);

        var member = await projectMemberRepository.GetByProjectAndUserAsync(projectId, userId, cancellationToken);
        if (member is null)
        {
            return false;
        }

        projectMemberRepository.Remove(member);
        await projectMemberRepository.SaveChangesAsync(cancellationToken);

        await auditLogService.LogActionAsync(userId, actorUserId, project.OrganizationId, "project.member.remove", "project_members", member.Id, "warning", ipAddress, cancellationToken);

        return true;
    }

    private async Task EnsureCanReadProject(Guid projectId, Guid actorUserId, string actorRole, CancellationToken cancellationToken)
    {
        var normalizedRole = NormalizeRole(actorRole);
        if (normalizedRole == "superadmin")
        {
            return;
        }

        var project = await projectRepository.GetByIdAsync(projectId, cancellationToken)
                      ?? throw new InvalidOperationException("Project not found");

        if (normalizedRole == "systemadmin")
        {
            var actorOrganizationId = await dbContext.Users
                .Where(x => x.Id == actorUserId)
                .Select(x => x.OrganizationId)
                .FirstOrDefaultAsync(cancellationToken);

            if (!actorOrganizationId.HasValue || actorOrganizationId.Value != project.OrganizationId)
            {
                throw new UnauthorizedAccessException("System Admin can only access projects inside their organization");
            }

            return;
        }

        if (normalizedRole == "projectmanager" && project.CreatedByUserId != actorUserId)
        {
            var isLead = project.Members.Any(member => member.UserId == actorUserId && member.MemberRole == MemberRole.Lead);
            if (!isLead)
            {
                throw new UnauthorizedAccessException("Project Manager can only access owned or lead-assigned projects");
            }
        }

        if (normalizedRole == "teammember")
        {
            var member = await projectMemberRepository.GetByProjectAndUserAsync(projectId, actorUserId, cancellationToken);
            if (member is null)
            {
                throw new UnauthorizedAccessException("TeamMember can only access assigned projects");
            }
        }
    }

    private async Task<Project> EnsureCanManageProject(Guid projectId, Guid actorUserId, string actorRole, CancellationToken cancellationToken)
    {
        var project = await projectRepository.GetByIdAsync(projectId, cancellationToken)
                      ?? throw new InvalidOperationException("Project not found");

        var normalizedRole = NormalizeRole(actorRole);
        if (normalizedRole == "systemadmin")
        {
            var actorOrganizationId = await dbContext.Users
                .Where(x => x.Id == actorUserId)
                .Select(x => x.OrganizationId)
                .FirstOrDefaultAsync(cancellationToken);

            if (!actorOrganizationId.HasValue || actorOrganizationId.Value != project.OrganizationId)
            {
                throw new UnauthorizedAccessException("System Admin can only manage members inside their organization");
            }

            return project;
        }

        if (normalizedRole == "projectmanager")
        {
            var isLead = project.Members.Any(member => member.UserId == actorUserId && member.MemberRole == MemberRole.Lead);
            if (project.CreatedByUserId != actorUserId && !isLead)
            {
                throw new UnauthorizedAccessException("Project Manager can only manage owned or lead-assigned projects");
            }

            return project;
        }

        throw new UnauthorizedAccessException("System Admin or Project Manager role required");
    }

    private static ProjectMemberDto Map(ProjectMember member)
    {
        return new ProjectMemberDto
        {
            Id = member.Id,
            ProjectId = member.ProjectId,
            UserId = member.UserId,
            MemberRole = member.MemberRole.ToString(),
            JoinedAt = member.JoinedAt
        };
    }

    private static MemberRole ParseMemberRole(string value)
    {
        if (!Enum.TryParse<MemberRole>(value, true, out var parsed))
        {
            throw new InvalidOperationException("Invalid member role");
        }

        return parsed;
    }

    private static string NormalizeRole(string role)
    {
        return role.Replace(" ", string.Empty).Trim().ToLowerInvariant();
    }
}
