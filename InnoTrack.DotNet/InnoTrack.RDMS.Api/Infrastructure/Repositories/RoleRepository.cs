using InnoTrack.RDMS.Api.Application.Interfaces.Repositories;
using InnoTrack.RDMS.Api.Domain.Entities;
using InnoTrack.RDMS.Api.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace InnoTrack.RDMS.Api.Infrastructure.Repositories;

public class RoleRepository(AppDbContext dbContext) : IRoleRepository
{
    public Task<List<Role>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return dbContext.Roles.OrderBy(x => x.Id).ToListAsync(cancellationToken);
    }

    public Task<Role?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return dbContext.Roles.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }
}
