using InnoTrack.RDMS.Blazor.Models;

namespace InnoTrack.RDMS.Blazor.Services;

public class AuthState
{
    public AuthResponse? Session { get; private set; }
    public bool IsAuthenticated => Session is not null && !string.IsNullOrWhiteSpace(Session.AccessToken);
    public event Action? OnChange;

    public void SetSession(AuthResponse response)
    {
        Session = response;
        OnChange?.Invoke();
    }

    public bool HasRole(string roleName)
    {
        return Session?.User?.Roles?.Contains(roleName) == true;
    }

    public void Clear()
    {
        Session = null;
        OnChange?.Invoke();
    }
}
