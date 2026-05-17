namespace InnoTrack.RDMS.Api.Application.Dtos.Auth;

public class LoginCaptchaChallengeDto
{
    public string ChallengeId { get; set; } = string.Empty;

    public string ImageDataUrl { get; set; } = string.Empty;

    public DateTime ExpiresAtUtc { get; set; }

    public int AnswerLength { get; set; }
}