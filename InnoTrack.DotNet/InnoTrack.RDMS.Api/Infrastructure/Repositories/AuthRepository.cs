using InnoTrack.RDMS.Api.Application.Interfaces.Repositories;
using InnoTrack.RDMS.Api.Domain.Entities;
using InnoTrack.RDMS.Api.Domain.Enums;
using InnoTrack.RDMS.Api.Infrastructure.Data;
using System.Data;
using Microsoft.EntityFrameworkCore;

namespace InnoTrack.RDMS.Api.Infrastructure.Repositories;

public class AuthRepository(AppDbContext dbContext) : IAuthRepository
{
    public async Task<AppUser?> GetUserByEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        var connection = dbContext.Database.GetDbConnection();
        var closeAfterQuery = false;
        if (connection.State != ConnectionState.Open)
        {
            await connection.OpenAsync(cancellationToken);
            closeAfterQuery = true;
        }

        await using var command = connection.CreateCommand();
        command.CommandText = @"
            SELECT id, email, password_hash, is_active, must_change_password, created_at, updated_at, first_name, last_name, role_id, organization_id
            FROM app_users
            WHERE LOWER(email) = LOWER(@email)
            LIMIT 1";

        var emailParameter = command.CreateParameter();
        emailParameter.ParameterName = "@email";
        emailParameter.Value = email;
        command.Parameters.Add(emailParameter);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            if (closeAfterQuery)
            {
                await connection.CloseAsync();
            }

            return null;
        }

        var rawUserId = reader.GetValue(0);
        var userId = rawUserId switch
        {
            Guid g => g,
            string s => Guid.Parse(s),
            byte[] b when b.Length == 16 => new Guid(b),
            _ => Guid.Parse(rawUserId.ToString() ?? throw new InvalidOperationException("Invalid user id value"))
        };
        var user = new AppUser
        {
            Id = userId,
            Email = reader.GetString(1),
            PasswordHash = reader.IsDBNull(2) ? null : reader.GetString(2),
            IsActive = reader.GetBoolean(3),
            MustChangePassword = !reader.IsDBNull(4) && reader.GetBoolean(4),
            FirstName = reader.IsDBNull(7) ? string.Empty : reader.GetString(7),
            LastName = reader.IsDBNull(8) ? string.Empty : reader.GetString(8),
            RoleId = reader.IsDBNull(9) ? 0 : reader.GetInt32(9),
            OrganizationId = reader.IsDBNull(10) ? null : ParseNullableGuid(reader.GetValue(10)),
            CreatedAt = reader.IsDBNull(5) ? DateTime.UtcNow : reader.GetDateTime(5),
            UpdatedAt = reader.IsDBNull(6)
                ? (reader.IsDBNull(5) ? DateTime.UtcNow : reader.GetDateTime(5))
                : reader.GetDateTime(6)
        };

        await reader.CloseAsync();

        if (closeAfterQuery)
        {
            await connection.CloseAsync();
        }

        user.Profile = await dbContext.Profiles
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == userId, cancellationToken);

        if (user.Profile is null && user.OrganizationId.HasValue)
        {
            var fullName = string.Join(' ', new[] { user.FirstName, user.LastName }.Where(value => !string.IsNullOrWhiteSpace(value))).Trim();
            user.Profile = new Profile
            {
                Id = user.Id,
                FullName = string.IsNullOrWhiteSpace(fullName) ? user.Email : fullName,
                OrganizationId = user.OrganizationId.Value,
                CreatedAt = user.CreatedAt,
                UpdatedAt = user.UpdatedAt,
            };
        }

        return user;
    }

    public async Task<List<UserRole>> GetUserRolesAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var connection = dbContext.Database.GetDbConnection();
        var closeAfterQuery = false;
        if (connection.State != ConnectionState.Open)
        {
            await connection.OpenAsync(cancellationToken);
            closeAfterQuery = true;
        }

        await using var command = connection.CreateCommand();
        command.CommandText = @"
            SELECT id, user_id, organization_id, role, created_at
            FROM user_roles
            WHERE user_id = @userId";

        var userIdParameter = command.CreateParameter();
        userIdParameter.ParameterName = "@userId";
        userIdParameter.Value = userId;
        command.Parameters.Add(userIdParameter);

        var roles = new List<UserRole>();

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var roleText = reader.IsDBNull(3) ? string.Empty : reader.GetString(3);
            roles.Add(new UserRole
            {
                Id = ParseGuid(reader.GetValue(0)),
                UserId = ParseGuid(reader.GetValue(1)),
                OrganizationId = ParseNullableGuid(reader.GetValue(2)) ?? Guid.Empty,
                Role = ParseRole(roleText),
                CreatedAt = reader.GetDateTime(4)
            });
        }

        await reader.CloseAsync();

        if (closeAfterQuery)
        {
            await connection.CloseAsync();
        }

        return roles;
    }

    public async Task AddActivityAsync(ActivityLog activityLog, CancellationToken cancellationToken = default)
    {
        await dbContext.ActivityLogs.AddAsync(activityLog, cancellationToken);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return dbContext.SaveChangesAsync(cancellationToken);
    }

    private static Guid ParseGuid(object rawGuid)
    {
        return rawGuid switch
        {
            Guid g => g,
            string s => Guid.Parse(s),
            byte[] b when b.Length == 16 => new Guid(b),
            _ => Guid.Parse(rawGuid.ToString() ?? throw new InvalidOperationException("Invalid guid value"))
        };
    }

    private static Guid? ParseNullableGuid(object rawGuid)
    {
        if (rawGuid is DBNull)
        {
            return null;
        }

        return ParseGuid(rawGuid);
    }

    private static AppRole ParseRole(string role)
    {
        var normalized = role.Trim().Replace("_", " ").ToLowerInvariant();

        return normalized switch
        {
            "super admin" => AppRole.SuperAdmin,
            "super administrator" => AppRole.SuperAdmin,
            "superadmin" => AppRole.SuperAdmin,
            "system admin" => AppRole.SystemAdmin,
            "system administrator" => AppRole.SystemAdmin,
            "systemadmin" => AppRole.SystemAdmin,
            "project manager" => AppRole.ProjectManager,
            "projectmanager" => AppRole.ProjectManager,
            "team member" => AppRole.TeamMember,
            "teammember" => AppRole.TeamMember,
            _ => AppRole.TeamMember
        };
    }
}
