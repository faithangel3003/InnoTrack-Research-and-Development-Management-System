using System.Security.Cryptography;
using System.Text;

namespace InnoTrack.RDMS.Api.Security.Encryption;

public sealed class AesEncryptionService(IConfiguration configuration) : IEncryptionService
{
    private readonly byte[] keyBytes = Convert.FromBase64String(configuration["Encryption:Key"]
        ?? throw new InvalidOperationException("Encryption:Key is not configured."));

    private readonly byte[] fallbackIvBytes = Convert.FromBase64String(configuration["Encryption:IV"]
        ?? throw new InvalidOperationException("Encryption:IV is not configured."));

    public string Encrypt(string plainText)
    {
        if (plainText is null)
        {
            throw new ArgumentNullException(nameof(plainText));
        }

        using var aes = CreateAes();
        var iv = RandomNumberGenerator.GetBytes(16);
        aes.IV = iv;

        using var encryptor = aes.CreateEncryptor();
        var plainBytes = Encoding.UTF8.GetBytes(plainText);
        var cipherBytes = encryptor.TransformFinalBlock(plainBytes, 0, plainBytes.Length);
        return Convert.ToBase64String(iv.Concat(cipherBytes).ToArray());
    }

    public string Decrypt(string cipherText)
    {
        if (string.IsNullOrWhiteSpace(cipherText))
        {
            return string.Empty;
        }

        var fullCipher = Convert.FromBase64String(cipherText);
        var iv = fullCipher.Length > 16 ? fullCipher[..16] : fallbackIvBytes;
        var cipherBytes = fullCipher.Length > 16 ? fullCipher[16..] : fullCipher;

        using var aes = CreateAes();
        aes.IV = iv;

        using var decryptor = aes.CreateDecryptor();
        var plainBytes = decryptor.TransformFinalBlock(cipherBytes, 0, cipherBytes.Length);
        return Encoding.UTF8.GetString(plainBytes);
    }

    public string GenerateSecureKey()
    {
        return Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
    }

    private Aes CreateAes()
    {
        if (keyBytes.Length != 32)
        {
            throw new InvalidOperationException("Encryption key must be 32 bytes (Base64 encoded).");
        }

        if (fallbackIvBytes.Length != 16)
        {
            throw new InvalidOperationException("Encryption IV must be 16 bytes (Base64 encoded).");
        }

        var aes = Aes.Create();
        aes.Mode = CipherMode.CBC;
        aes.Padding = PaddingMode.PKCS7;
        aes.KeySize = 256;
        aes.Key = keyBytes;
        return aes;
    }
}