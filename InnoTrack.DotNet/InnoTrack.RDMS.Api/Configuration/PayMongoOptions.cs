namespace InnoTrack.RDMS.Api.Configuration;

public class PayMongoOptions
{
    public string BaseUrl { get; set; } = "https://api.paymongo.com/v1/";
    public string SecretKey { get; set; } = string.Empty;
    public string PublicKey { get; set; } = string.Empty;
}