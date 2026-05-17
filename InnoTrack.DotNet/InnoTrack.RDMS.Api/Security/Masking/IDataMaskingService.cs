namespace InnoTrack.RDMS.Api.Security.Masking;

public interface IDataMaskingService
{
    string MaskEmail(string email);
    string MaskPhoneNumber(string phone);
    string MaskSssNumber(string sss);
    string MaskAddress(string address);
    string MaskGeneric(string value, int visibleChars);
}