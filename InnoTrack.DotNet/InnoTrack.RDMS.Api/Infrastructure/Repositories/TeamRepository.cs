using InnoTrack.RDMS.Api.Application.Interfaces.Repositories;
using InnoTrack.RDMS.Api.Domain.Entities;
using InnoTrack.RDMS.Api.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace InnoTrack.RDMS.Api.Infrastructure.Repositories;

public class TeamRepository(AppDbContext dbContext) : ITeamRepository
{
    public Task<List<Team>> GetByOrganizationAsync(Guid organizationId, CancellationToken cancellationToken = default)
    {
        return dbContext.Set<Team>()
            .Include(team => team.Users)
            .Where(team => team.OrganizationId == organizationId)
            .OrderBy(team => team.Name)
            .ToListAsync(cancellationToken);
    }

    public Task<Team?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return dbContext.Set<Team>()
            .Include(team => team.Users)
            .FirstOrDefaultAsync(team => team.Id == id, cancellationToken);
    }

    public Task<bool> ExistsByNameAsync(Guid organizationId, string name, Guid? excludeId = null, CancellationToken cancellationToken = default)
    {
        var normalizedName = name.Trim();

        return dbContext.Set<Team>()
            .AnyAsync(team => team.OrganizationId == organizationId
                && team.Name == normalizedName
                && (!excludeId.HasValue || team.Id != excludeId.Value), cancellationToken);
    }

    public Task<bool> OrganizationExistsAsync(Guid organizationId, CancellationToken cancellationToken = default)
    {
        return dbContext.Organizations.AnyAsync(organization => organization.Id == organizationId, cancellationToken);
    }

    public Task AddAsync(Team team, CancellationToken cancellationToken = default)
    {
        return dbContext.Set<Team>().AddAsync(team, cancellationToken).AsTask();
    }

    public async Task UnassignUsersAsync(Guid teamId, CancellationToken cancellationToken = default)
    {
        var users = await dbContext.Users
            .Where(user => user.TeamId == teamId)
            .ToListAsync(cancellationToken);

        foreach (var user in users)
        {
            user.TeamId = null;
            user.UpdatedAt = DateTime.UtcNow;
        }
    }

    public void Remove(Team team)
    {
        dbContext.Set<Team>().Remove(team);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return dbContext.SaveChangesAsync(cancellationToken);
    }
}