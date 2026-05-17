namespace InnoTrack.RDMS.Api.Security.Password;

public sealed class PasswordHashService : IPasswordHashService
{
    private const int WorkFactor = 12;

    public string Hash(string plainPassword)
    {
        return BCrypt.Net.BCrypt.HashPassword(plainPassword, workFactor: WorkFactor);
    }

    public bool Verify(string plainPassword, string hashedPassword)
    {
        return BCrypt.Net.BCrypt.Verify(plainPassword, hashedPassword);
    }

    public bool NeedsRehash(string hashedPassword)
    {
        if (string.IsNullOrWhiteSpace(hashedPassword))
        {
            return true;
        }

        var parts = hashedPassword.Split('$', StringSplitOptions.RemoveEmptyEntries);
        return parts.Length < 2 || !int.TryParse(parts[1], out var rounds) || rounds < WorkFactor;
    }
}