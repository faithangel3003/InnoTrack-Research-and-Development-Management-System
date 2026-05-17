namespace InnoTrack.RDMS.Api.Security.Password;

public interface IPasswordHashService
{
    string Hash(string plainPassword);
    bool Verify(string plainPassword, string hashedPassword);
    bool NeedsRehash(string hashedPassword);
}