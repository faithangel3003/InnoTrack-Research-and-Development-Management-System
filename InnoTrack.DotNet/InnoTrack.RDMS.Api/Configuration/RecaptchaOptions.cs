namespace InnoTrack.RDMS.Api.Configuration;

public class RecaptchaOptions
{
    public bool Enabled { get; set; } = true;
    public string SecretKey { get; set; } = string.Empty;
    public string VerifyUrl { get; set; } = "https://www.google.com/recaptcha/api/siteverify";
}
