namespace InnoTrack.RDMS.Api.Security.Sanitization;

public interface IInputSanitizationService
{
    string SanitizeHtml(string input);
    string SanitizePlainText(string input);
    string SanitizeFileName(string fileName);
    T SanitizeDto<T>(T dto);
}