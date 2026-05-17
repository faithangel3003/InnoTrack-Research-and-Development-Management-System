using InnoTrack.RDMS.Api.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace InnoTrack.RDMS.Api.Application.Services;

public partial class DocumentService
{
    private async Task<List<Document>> FilterDocumentsForActorAsync(List<Document> documents, Guid actorUserId, string actorRole, CancellationToken cancellationToken)
    {
        var normalizedRole = NormalizeRole(actorRole);
        if (normalizedRole is "superadmin" or "systemadmin")
        {
            return documents;
        }

        var accessibleProjectIds = await ResolveAccessibleProjectIdsAsync(actorUserId, actorRole, cancellationToken);
        return documents
            .Where(document => !document.DeletedAt.HasValue)
            .Where(document => document.ProjectId.HasValue
                ? accessibleProjectIds.Contains(document.ProjectId.Value)
                : document.UploadedByUserId == actorUserId)
            .ToList();
    }

    private async Task EnsureCanAccessDocumentAsync(Document document, Guid actorUserId, string actorRole, CancellationToken cancellationToken)
    {
        if (!await CanAccessDocumentAsync(document, actorUserId, actorRole, cancellationToken))
        {
            throw new UnauthorizedAccessException("You are not allowed to access this document");
        }
    }

    private async Task<bool> CanAccessDocumentAsync(Document document, Guid actorUserId, string actorRole, CancellationToken cancellationToken)
    {
        var normalizedRole = NormalizeRole(actorRole);
        if (normalizedRole == "superadmin")
        {
            return true;
        }

        var actorOrganizationId = await GetActorOrganizationIdAsync(actorUserId, cancellationToken);
        if (!actorOrganizationId.HasValue || actorOrganizationId.Value != document.OrganizationId)
        {
            return false;
        }

        if (normalizedRole == "systemadmin")
        {
            return true;
        }

        if (!document.ProjectId.HasValue)
        {
            return document.UploadedByUserId == actorUserId;
        }

        var accessibleProjectIds = await ResolveAccessibleProjectIdsAsync(actorUserId, actorRole, cancellationToken);
        return accessibleProjectIds.Contains(document.ProjectId.Value);
    }

    private async Task EnsureCanCreateDocumentAsync(Guid actorUserId, string actorRole, Guid? projectId, Guid organizationId, CancellationToken cancellationToken)
    {
        var normalizedRole = NormalizeRole(actorRole);
        if (normalizedRole == "systemadmin")
        {
            var actorOrganizationId = await GetActorOrganizationIdAsync(actorUserId, cancellationToken);
            if (actorOrganizationId.HasValue && actorOrganizationId.Value == organizationId)
            {
                return;
            }

            throw new UnauthorizedAccessException("System Admin can only upload documents inside their organization");
        }

        if (normalizedRole == "projectmanager")
        {
            if (!projectId.HasValue)
            {
                return;
            }

            var ownsProject = await dbContext.Projects.AnyAsync(
                project => project.Id == projectId.Value && project.OrganizationId == organizationId && project.CreatedByUserId == actorUserId,
                cancellationToken);

            if (!ownsProject)
            {
                throw new UnauthorizedAccessException("ProjectManager can only upload documents into owned projects");
            }

            return;
        }

        if (normalizedRole == "teammember")
        {
            if (!projectId.HasValue)
            {
                throw new UnauthorizedAccessException("TeamMember uploads must be linked to an assigned project");
            }

            if (!await CanTeamMemberAccessProjectAsync(projectId.Value, actorUserId, cancellationToken))
            {
                throw new UnauthorizedAccessException("TeamMember can only upload documents to assigned projects");
            }

            return;
        }

        throw new UnauthorizedAccessException("You do not have permission to upload research documents");
    }

    private async Task EnsureCanEditDocumentAsync(Document document, Guid actorUserId, string actorRole, CancellationToken cancellationToken)
    {
        var normalizedRole = NormalizeRole(actorRole);
        if (normalizedRole == "systemadmin")
        {
            var actorOrganizationId = await GetActorOrganizationIdAsync(actorUserId, cancellationToken);
            if (actorOrganizationId.HasValue && actorOrganizationId.Value == document.OrganizationId)
            {
                return;
            }

            throw new UnauthorizedAccessException("System Admin can only edit documents inside their organization");
        }

        if (normalizedRole == "projectmanager")
        {
            if (!document.ProjectId.HasValue)
            {
                if (document.UploadedByUserId != actorUserId)
                {
                    throw new UnauthorizedAccessException("ProjectManager can only edit global documents they uploaded");
                }

                return;
            }

            if (!await CanProjectManagerAccessProjectAsync(document.ProjectId.Value, actorUserId, cancellationToken))
            {
                throw new UnauthorizedAccessException("ProjectManager can only edit documents in owned projects");
            }

            return;
        }

        if (normalizedRole == "teammember")
        {
            if (document.UploadedByUserId != actorUserId)
            {
                throw new UnauthorizedAccessException("TeamMember can only edit or version their own documents");
            }

            if (!document.ProjectId.HasValue || !await CanTeamMemberAccessProjectAsync(document.ProjectId.Value, actorUserId, cancellationToken))
            {
                throw new UnauthorizedAccessException("TeamMember can only edit or version documents in assigned projects");
            }

            return;
        }

        throw new UnauthorizedAccessException("You do not have permission to modify research documents");
    }

    private async Task EnsureCanArchiveDocumentAsync(Document document, Guid actorUserId, string actorRole, CancellationToken cancellationToken)
    {
        var normalizedRole = NormalizeRole(actorRole);
        if (normalizedRole == "superadmin")
        {
            return;
        }

        if (normalizedRole == "systemadmin")
        {
            var actorOrganizationId = await GetActorOrganizationIdAsync(actorUserId, cancellationToken);
            if (actorOrganizationId.HasValue && actorOrganizationId.Value == document.OrganizationId)
            {
                return;
            }
        }

        if (normalizedRole == "projectmanager")
        {
            if (!document.ProjectId.HasValue)
            {
                if (document.UploadedByUserId == actorUserId)
                {
                    return;
                }
            }
            else if (await CanProjectManagerAccessProjectAsync(document.ProjectId.Value, actorUserId, cancellationToken))
            {
                return;
            }
        }

        throw new UnauthorizedAccessException("You do not have permission to archive this document");
    }

    private async Task EnsureCanDeleteDocumentAsync(Document document, Guid actorUserId, string actorRole, CancellationToken cancellationToken)
    {
        var normalizedRole = NormalizeRole(actorRole);
        if (normalizedRole == "superadmin")
        {
            return;
        }

        if (normalizedRole == "systemadmin")
        {
            var actorOrganizationId = await GetActorOrganizationIdAsync(actorUserId, cancellationToken);
            if (actorOrganizationId.HasValue && actorOrganizationId.Value == document.OrganizationId)
            {
                return;
            }
        }

        if (normalizedRole == "projectmanager")
        {
            if (!document.ProjectId.HasValue)
            {
                if (document.UploadedByUserId == actorUserId)
                {
                    return;
                }
            }
            else if (await CanProjectManagerAccessProjectAsync(document.ProjectId.Value, actorUserId, cancellationToken))
            {
                return;
            }
        }

        if (normalizedRole == "teammember" && document.UploadedByUserId == actorUserId)
        {
            return;
        }

        throw new UnauthorizedAccessException("You do not have permission to delete this document");
    }

    private async Task<HashSet<Guid>> ResolveAccessibleProjectIdsAsync(Guid actorUserId, string actorRole, CancellationToken cancellationToken)
    {
        var normalizedRole = NormalizeRole(actorRole);

        if (normalizedRole == "projectmanager")
        {
            return (await dbContext.Projects
                .Where(project => project.CreatedByUserId == actorUserId || project.Members.Any(member => member.UserId == actorUserId && member.MemberRole == Domain.Enums.MemberRole.Lead))
                .Select(project => project.Id)
                .ToListAsync(cancellationToken))
                .ToHashSet();
        }

        if (normalizedRole == "teammember")
        {
            var memberProjectIds = dbContext.ProjectMembers
                .Where(member => member.UserId == actorUserId)
                .Select(member => member.ProjectId);

            var assignedProjectIds = dbContext.ProjectTasks
                .Where(task => task.AssignedToUserId == actorUserId)
                .Select(task => task.ProjectId);

            return (await memberProjectIds
                .Concat(assignedProjectIds)
                .Distinct()
                .ToListAsync(cancellationToken))
                .ToHashSet();
        }

        return new HashSet<Guid>();
    }

    private Task<bool> CanProjectManagerAccessProjectAsync(Guid projectId, Guid actorUserId, CancellationToken cancellationToken)
    {
        return dbContext.Projects.AnyAsync(
            project => project.Id == projectId && (project.CreatedByUserId == actorUserId || project.Members.Any(member => member.UserId == actorUserId && member.MemberRole == Domain.Enums.MemberRole.Lead)),
            cancellationToken);
    }

    private async Task<bool> CanTeamMemberAccessProjectAsync(Guid projectId, Guid actorUserId, CancellationToken cancellationToken)
    {
        var isMember = await dbContext.ProjectMembers.AnyAsync(member => member.ProjectId == projectId && member.UserId == actorUserId, cancellationToken);
        if (isMember)
        {
            return true;
        }

        return await dbContext.ProjectTasks.AnyAsync(task => task.ProjectId == projectId && task.AssignedToUserId == actorUserId, cancellationToken);
    }
}