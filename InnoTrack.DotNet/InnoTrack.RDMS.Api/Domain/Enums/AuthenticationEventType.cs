namespace InnoTrack.RDMS.Api.Domain.Enums;

public enum AuthenticationEventType
{
    LoginSuccess,
    LoginFailed,
    Logout,
    PasswordChanged,
    AccountLocked
}