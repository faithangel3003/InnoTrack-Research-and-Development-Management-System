using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text.Json;
using InnoTrack.RDMS.Blazor.Models;
using Microsoft.AspNetCore.Components.Authorization;
using Microsoft.JSInterop;

namespace InnoTrack.RDMS.Blazor.Services;

public class CustomAuthStateProvider(AuthState authState, IJSRuntime jsRuntime) : AuthenticationStateProvider
{
    private const string SessionStorageKey = "innotrack.auth.session";
    private bool loaded;

    public override async Task<AuthenticationState> GetAuthenticationStateAsync()
    {
        await EnsureSessionLoadedAsync();

        if (!authState.IsAuthenticated || authState.Session is null)
        {
            return new AuthenticationState(new ClaimsPrincipal(new ClaimsIdentity()));
        }

        var claims = BuildClaims(authState.Session);
        return new AuthenticationState(new ClaimsPrincipal(new ClaimsIdentity(claims, "jwt")));
    }

    public async Task SignInAsync(AuthResponse session)
    {
        authState.SetSession(session);

        var payload = JsonSerializer.Serialize(session);
        await SafeInvokeAsync(() => jsRuntime.InvokeVoidAsync("innoTrackAuth.setSession", payload));

        NotifyAuthenticationStateChanged(GetAuthenticationStateAsync());
    }

    public async Task SignOutAsync()
    {
        authState.Clear();
        await SafeInvokeAsync(() => jsRuntime.InvokeVoidAsync("innoTrackAuth.clearSession"));
        NotifyAuthenticationStateChanged(GetAuthenticationStateAsync());
    }

    public async Task EnsureSessionLoadedAsync()
    {
        if (loaded)
        {
            return;
        }

        loaded = true;

        var stored = await SafeInvokeAsync(() => jsRuntime.InvokeAsync<string?>("innoTrackAuth.getSession"));
        if (string.IsNullOrWhiteSpace(stored))
        {
            return;
        }

        try
        {
            var session = JsonSerializer.Deserialize<AuthResponse>(stored);
            if (session is not null && !string.IsNullOrWhiteSpace(session.AccessToken))
            {
                authState.SetSession(session);
            }
        }
        catch
        {
            await SafeInvokeAsync(() => jsRuntime.InvokeVoidAsync("innoTrackAuth.clearSession"));
            authState.Clear();
        }
    }

    private static IEnumerable<Claim> BuildClaims(AuthResponse session)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, session.User.Id.ToString()),
            new(ClaimTypes.Email, session.User.Email),
            new(ClaimTypes.Name, string.IsNullOrWhiteSpace(session.User.FullName) ? session.User.Email : session.User.FullName)
        };

        foreach (var role in session.User.Roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        var handler = new JwtSecurityTokenHandler();
        if (handler.CanReadToken(session.AccessToken))
        {
            var jwt = handler.ReadJwtToken(session.AccessToken);
            foreach (var claim in jwt.Claims)
            {
                if (claims.Any(c => c.Type == claim.Type && c.Value == claim.Value))
                {
                    continue;
                }

                claims.Add(claim);
            }
        }

        return claims;
    }

    private static async Task SafeInvokeAsync(Func<ValueTask> action)
    {
        try
        {
            await action();
        }
        catch (InvalidOperationException)
        {
            // JS interop unavailable during prerender.
        }
        catch (JSDisconnectedException)
        {
            // Browser disconnected.
        }
    }

    private static async Task<T?> SafeInvokeAsync<T>(Func<ValueTask<T?>> action)
    {
        try
        {
            return await action();
        }
        catch (InvalidOperationException)
        {
            return default;
        }
        catch (JSDisconnectedException)
        {
            return default;
        }
    }
}
