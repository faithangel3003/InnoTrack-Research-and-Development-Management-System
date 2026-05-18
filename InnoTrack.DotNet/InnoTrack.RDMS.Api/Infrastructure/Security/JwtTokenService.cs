using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using InnoTrack.RDMS.Api.Application.Dtos.Auth;
using InnoTrack.RDMS.Api.Application.Interfaces.Services;
using InnoTrack.RDMS.Api.Domain.Entities;
using Microsoft.IdentityModel.Tokens;

namespace InnoTrack.RDMS.Api.Infrastructure.Security;

public class JwtTokenService(IConfiguration configuration) : IJwtTokenService
{
    public AuthResponseDto CreateToken(AppUser user, IEnumerable<string> roles)
    {
        var issuer = configuration["Jwt:Issuer"] ?? "InnoTrack";
        var audience = configuration["Jwt:Audience"] ?? "InnoTrack.Client";
        var signingKey = configuration["Jwt:SigningKey"] ?? throw new InvalidOperationException("JWT signing key is missing");
        var expiryMinutes = int.TryParse(configuration["Jwt:ExpiryMinutes"], out var value) ? value : 60;

        var expiresAt = DateTime.UtcNow.AddMinutes(expiryMinutes);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.Profile?.FullName ?? user.Email)
        };

        if (user.Profile?.OrganizationId is Guid organizationId)
        {
            claims.Add(new Claim("organization_id", organizationId.ToString()));
        }

        claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));

        // Also add condensed role variants (no spaces) to support clients
        // and checks that may use different role name formats (e.g. "SuperAdmin").
        var condensed = roles.Select(r => r.Replace(" ", string.Empty)).Distinct();
        foreach (var r in condensed)
        {
            if (!claims.Any(c => c.Type == ClaimTypes.Role && c.Value == r))
            {
                claims.Add(new Claim(ClaimTypes.Role, r));
            }
        }

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = expiresAt,
            Issuer = issuer,
            Audience = audience,
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey)),
                SecurityAlgorithms.HmacSha256)
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var securityToken = tokenHandler.CreateToken(tokenDescriptor);
        var token = tokenHandler.WriteToken(securityToken);
        var roleList = roles.ToList();
        var fullName = BuildFullName(user);
        var (firstName, lastName) = ResolveNames(user, fullName);

        return new AuthResponseDto
        {
            AccessToken = token,
            ExpiresAtUtc = expiresAt,
            User = new UserProfileDto
            {
                Id = user.Id,
                Email = user.Email,
                FirstName = firstName,
                LastName = lastName,
                FullName = fullName,
                Role = roleList.FirstOrDefault() ?? string.Empty,
                OrganizationId = user.Profile?.OrganizationId,
                MustChangePassword = user.MustChangePassword,
                Roles = roleList
            }
        };
    }

    private static string BuildFullName(AppUser user)
    {
        var fullName = string.Join(' ', new[] { user.FirstName, user.LastName }.Where(value => !string.IsNullOrWhiteSpace(value))).Trim();
        if (!string.IsNullOrWhiteSpace(fullName))
        {
            return fullName;
        }

        return user.Profile?.FullName ?? user.Email;
    }

    private static (string FirstName, string LastName) ResolveNames(AppUser user, string fullName)
    {
        if (!string.IsNullOrWhiteSpace(user.FirstName) || !string.IsNullOrWhiteSpace(user.LastName))
        {
            return (user.FirstName, user.LastName);
        }

        var parts = fullName.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (parts.Length == 0)
        {
            return (string.Empty, string.Empty);
        }

        return (parts[0], parts.Length > 1 ? string.Join(' ', parts.Skip(1)) : string.Empty);
    }
}
