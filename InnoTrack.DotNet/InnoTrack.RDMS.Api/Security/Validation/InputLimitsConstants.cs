namespace InnoTrack.RDMS.Api.Security.Validation;

public static class InputLimitsConstants
{
    public const int Name = 150;
    public const int ShortDescription = 500;
    public const int LongDescription = 5000;
    public const int Email = 254;
    public const int Phone = 20;
    public const int Url = 2048;
    public const int FileName = 255;
    public const int SearchQuery = 200;
    public const int MessageContent = 10000;
    public const int CommentContent = 3000;
    public const int AnnouncementBody = 20000;
    public const int PasswordMin = 12;
    public const int PasswordMax = 128;
    public const int RequestBody = 10_485_760;
    public const int FileUpload = 52_428_800;
    public const int MultipartHeaders = 16_384;
}