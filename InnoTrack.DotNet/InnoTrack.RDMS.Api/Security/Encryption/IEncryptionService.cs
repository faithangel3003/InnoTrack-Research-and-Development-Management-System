namespace InnoTrack.RDMS.Api.Security.Encryption;

public interface IEncryptionService
{
    string Encrypt(string plainText);
    string Decrypt(string cipherText);
    string GenerateSecureKey();
}