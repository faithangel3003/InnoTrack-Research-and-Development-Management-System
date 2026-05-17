using InnoTrack.RDMS.Api.Application.Interfaces.Repositories;
using InnoTrack.RDMS.Api.Domain.Entities;
using InnoTrack.RDMS.Api.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace InnoTrack.RDMS.Api.Infrastructure.Repositories;

public class ProjectMemberRepository(AppDbContext dbContext) : IProjectMemberRepository
{
    public Task<List<ProjectMember>> GetByProjectAsync(Guid projectId, CancellationToken cancellationToken = default)
    {
        return dbContext.ProjectMembers
            .Where(x => x.ProjectId == projectId)
            .OrderByDescending(x => x.JoinedAt)
            .ToListAsync(cancellationToken);
    }

    public Task<ProjectMember?> GetByProjectAndUserAsync(Guid projectId, Guid userId, CancellationToken cancellationToken = default)
    {
        return dbContext.ProjectMembers
            .FirstOrDefaultAsync(x => x.ProjectId == projectId && x.UserId == userId, cancellationToken);
    }

    public async Task AddAsync(ProjectMember member, CancellationToken cancellationToken = default)
    {
        await dbContext.ProjectMembers.AddAsync(member, cancellationToken);
    }

    public void Remove(ProjectMember member)
    {
        dbContext.ProjectMembers.Remove(member);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return dbContext.SaveChangesAsync(cancellationToken);
    }
}
