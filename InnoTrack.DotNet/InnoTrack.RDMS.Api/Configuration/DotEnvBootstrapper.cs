using System.Text;

namespace InnoTrack.RDMS.Api.Configuration;

public static class DotEnvBootstrapper
{
    public static void Apply(WebApplicationBuilder builder)
    {
        var envFilePath = FindEnvFile(builder.Environment.ContentRootPath);
        if (envFilePath is null)
        {
            return;
        }

        var envValues = ParseEnvFile(envFilePath);
        var overrides = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);

        SetIfPresent(overrides, envValues, "Jwt:Issuer", "JWT_ISSUER");
        SetIfPresent(overrides, envValues, "Jwt:Audience", "JWT_AUDIENCE");
        SetIfPresent(overrides, envValues, "Jwt:SigningKey", "JWT_SIGNING_KEY");
        SetIfPresent(overrides, envValues, "Jwt:ExpiryMinutes", "JWT_EXPIRY_MINUTES");
        SetIfPresent(overrides, envValues, "ClientUrl", "CLIENT_URL");
        SetIfPresent(overrides, envValues, "Cloudinary:Url", "CLOUDINARY_URL");
        SetIfPresent(overrides, envValues, "Encryption:Key", "ENCRYPTION_KEY");
        SetIfPresent(overrides, envValues, "Encryption:IV", "ENCRYPTION_IV");
        SetIfPresent(overrides, envValues, "Smtp:Host", "SMTP_HOST");
        SetIfPresent(overrides, envValues, "Smtp:Port", "SMTP_PORT");
        SetIfPresent(overrides, envValues, "Smtp:Username", "SMTP_USERNAME");
        SetIfPresent(overrides, envValues, "Smtp:Password", "SMTP_PASSWORD");
        SetIfPresent(overrides, envValues, "Smtp:FromEmail", "SMTP_FROM_EMAIL");
        SetIfPresent(overrides, envValues, "Smtp:FromName", "SMTP_FROM_NAME");
        SetIfPresent(overrides, envValues, "Smtp:EnableSsl", "SMTP_ENABLE_SSL");
        SetIfPresent(overrides, envValues, "Smtp:TimeoutMs", "SMTP_TIMEOUT_MS");
        SetIfPresent(overrides, envValues, "AccountRecovery:OtpExpiryMinutes", "ACCOUNT_RECOVERY_OTP_EXPIRY_MINUTES");
        SetIfPresent(overrides, envValues, "Api:Port", "API_PORT");
        SetIfPresent(overrides, envValues, "Recaptcha:Enabled", "RECAPTCHA_ENABLED");
        SetIfPresent(overrides, envValues, "Recaptcha:SecretKey", "RECAPTCHA_SECRET_KEY");
        SetIfPresent(overrides, envValues, "Recaptcha:VerifyUrl", "RECAPTCHA_VERIFY_URL");
        SetIfPresent(overrides, envValues, "PayMongo:BaseUrl", "PAYMONGO_BASE_URL");
        SetIfPresent(overrides, envValues, "PayMongo:SecretKey", "PAYMONGO_SECRET_KEY");
        SetIfPresent(overrides, envValues, "PayMongo:PublicKey", "PAYMONGO_PUBLIC_KEY");

        var connectionString = BuildConnectionString(envValues, builder.Configuration, builder.Environment.IsDevelopment());
        if (!string.IsNullOrWhiteSpace(connectionString))
        {
            overrides["ConnectionStrings:DefaultConnection"] = connectionString;
        }

        builder.Configuration.AddInMemoryCollection(overrides!);
    }

    private static string? FindEnvFile(string contentRootPath)
    {
        var directory = new DirectoryInfo(contentRootPath);
        while (directory is not null)
        {
            var candidate = Path.Combine(directory.FullName, ".env");
            if (File.Exists(candidate))
            {
                return candidate;
            }

            directory = directory.Parent;
        }

        return null;
    }

    private static Dictionary<string, string> ParseEnvFile(string filePath)
    {
        var values = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        foreach (var rawLine in File.ReadAllLines(filePath))
        {
            var line = rawLine.Trim();
            if (string.IsNullOrWhiteSpace(line) || line.StartsWith('#'))
            {
                continue;
            }

            var separatorIndex = line.IndexOf('=');
            if (separatorIndex <= 0)
            {
                continue;
            }

            var key = line[..separatorIndex].Trim();
            var value = line[(separatorIndex + 1)..].Trim().Trim('"');
            values[key] = value;
        }

        return values;
    }

    private static void SetIfPresent(IDictionary<string, string?> overrides, IReadOnlyDictionary<string, string> envValues, string configKey, string envKey)
    {
        var value = Environment.GetEnvironmentVariable(envKey);
        if (string.IsNullOrWhiteSpace(value) && envValues.TryGetValue(envKey, out var fileValue))
        {
            value = fileValue;
        }

        if (!string.IsNullOrWhiteSpace(value))
        {
            overrides[configKey] = value;
        }
    }

    private static string? BuildConnectionString(IReadOnlyDictionary<string, string> envValues, IConfiguration configuration, bool isDevelopment)
    {
        var host = ResolveValue(envValues, "DB_HOST");
        var port = ResolveValue(envValues, "DB_PORT");
        var database = ResolveValue(envValues, "DB_NAME");
        var user = ResolveValue(envValues, "DB_USER");
        var password = ResolveValue(envValues, "DB_PASSWORD") ?? string.Empty;

        if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(port) || string.IsNullOrWhiteSpace(database) || string.IsNullOrWhiteSpace(user))
        {
            return configuration.GetConnectionString("DefaultConnection");
        }

        var sslMode = ResolveValue(envValues, "DB_SSL_MODE") ?? (isDevelopment ? "None" : "Required");
        var allowPublicKeyRetrieval = ResolveValue(envValues, "DB_ALLOW_PUBLIC_KEY_RETRIEVAL") ?? "true";

        var builder = new StringBuilder();
        builder.Append($"server={host};port={port};database={database};user={user};password={password}");
        builder.Append($";SslMode={sslMode}");
        builder.Append($";AllowPublicKeyRetrieval={allowPublicKeyRetrieval}");
        return builder.ToString();
    }

    private static string? ResolveValue(IReadOnlyDictionary<string, string> envValues, string key)
    {
        return Environment.GetEnvironmentVariable(key)
            ?? (envValues.TryGetValue(key, out var value) ? value : null);
    }
}