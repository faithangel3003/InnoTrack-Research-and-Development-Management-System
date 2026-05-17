using InnoTrack.RDMS.Api.Application.Interfaces.Repositories;
using InnoTrack.RDMS.Api.Domain.Entities;
using InnoTrack.RDMS.Api.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace InnoTrack.RDMS.Api.Infrastructure.Repositories;

public class UserRepository(AppDbContext dbContext) : IUserRepository
{
    public Task<List<AppUser>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return dbContext.Users
            .Include(x => x.Role)
            .Include(x => x.Organization)
            .Include(x => x.Team)
            .Include(x => x.Profile)
            .OrderBy(x => x.Email)
            .ToListAsync(cancellationToken);
    }

    public Task<List<AppUser>> GetByOrganizationAsync(Guid organizationId, CancellationToken cancellationToken = default)
    {
        return dbContext.Users
            .Include(x => x.Role)
            .Include(x => x.Organization)
            .Include(x => x.Team)
            .Include(x => x.Profile)
            .Where(x => x.OrganizationId == organizationId)
            .OrderBy(x => x.Email)
            .ToListAsync(cancellationToken);
    }

    public Task<AppUser?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return dbContext.Users
            .Include(x => x.Role)
            .Include(x => x.Organization)
            .Include(x => x.Team)
            .Include(x => x.Profile)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public Task<AppUser?> GetByEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        return dbContext.Users.FirstOrDefaultAsync(x => x.Email == email, cancellationToken);
    }

    public async Task AddAsync(AppUser user, CancellationToken cancellationToken = default)
    {
        await dbContext.Users.AddAsync(user, cancellationToken);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return dbContext.SaveChangesAsync(cancellationToken);
    }
}
