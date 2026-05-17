using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using InnoTrack.RDMS.Blazor.Models;

namespace InnoTrack.RDMS.Blazor.Services;

public class InnoTrackApiClient(
    IHttpClientFactory httpClientFactory,
    AuthState authState,
    CustomAuthStateProvider authStateProvider)
{
    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        var client = httpClientFactory.CreateClient("InnoTrackApi");
        var response = await client.PostAsJsonAsync("api/auth/login", request, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var rawMessage = await response.Content.ReadAsStringAsync(cancellationToken);
            var serverMessage = ExtractServerMessage(rawMessage);

            if ((int)response.StatusCode == 401)
            {
                throw new InvalidOperationException(serverMessage ?? "Invalid credentials");
            }

            throw new InvalidOperationException(
                serverMessage ?? $"Login failed with status {(int)response.StatusCode} ({response.ReasonPhrase}).");
        }

        var payload = await response.Content.ReadFromJsonAsync<AuthResponse>(cancellationToken: cancellationToken)
                      ?? throw new InvalidOperationException("Unexpected login response");

        await authStateProvider.SignInAsync(payload);
        return payload;
    }

    public async Task LogoutAsync(CancellationToken cancellationToken = default)
    {
        var client = await CreateAuthenticatedClientAsync(cancellationToken);
        var response = await client.PostAsync("api/auth/logout", null, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException("Logout failed");
        }

        await authStateProvider.SignOutAsync();
    }

    public async Task<List<ProjectViewModel>> GetProjectsAsync(CancellationToken cancellationToken = default)
    {
        var client = await CreateAuthenticatedClientAsync(cancellationToken);
        var projects = await client.GetFromJsonAsync<List<ProjectViewModel>>("api/projects", cancellationToken);
        return projects ?? new List<ProjectViewModel>();
    }

    public async Task<List<UserViewModel>> GetUsersAsync(CancellationToken cancellationToken = default)
    {
        var client = await CreateAuthenticatedClientAsync(cancellationToken);
        var users = await client.GetFromJsonAsync<List<UserViewModel>>("api/users", cancellationToken);
        return users ?? new List<UserViewModel>();
    }

    public async Task<UserViewModel?> GetUserByIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var client = await CreateAuthenticatedClientAsync(cancellationToken);
        return await client.GetFromJsonAsync<UserViewModel>($"api/users/{userId}", cancellationToken);
    }

    public async Task<UserViewModel> CreateUserAsync(CreateUserRequest request, CancellationToken cancellationToken = default)
    {
        var client = await CreateAuthenticatedClientAsync(cancellationToken);
        var response = await client.PostAsJsonAsync("api/users", request, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException("Could not create user");
        }

        return await response.Content.ReadFromJsonAsync<UserViewModel>(cancellationToken: cancellationToken)
               ?? throw new InvalidOperationException("Unexpected create-user response");
    }

    public async Task<UserViewModel> UpdateUserAsync(Guid userId, UpdateUserRequest request, CancellationToken cancellationToken = default)
    {
        var client = await CreateAuthenticatedClientAsync(cancellationToken);
        var response = await client.PutAsJsonAsync($"api/users/{userId}", request, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException("Could not update user");
        }

        return await response.Content.ReadFromJsonAsync<UserViewModel>(cancellationToken: cancellationToken)
               ?? throw new InvalidOperationException("Unexpected update-user response");
    }

    public async Task DeactivateUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var client = await CreateAuthenticatedClientAsync(cancellationToken);
        var response = await client.PatchAsync($"api/users/{userId}/deactivate", null, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException("Could not deactivate user");
        }
    }

    public async Task ChangeUserRoleAsync(Guid userId, int roleId, CancellationToken cancellationToken = default)
    {
        var client = await CreateAuthenticatedClientAsync(cancellationToken);
        var response = await client.PatchAsJsonAsync($"api/users/{userId}/role", new ChangeRoleRequest { RoleId = roleId }, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException("Could not change user role");
        }
    }

    public async Task<List<RoleViewModel>> GetRolesAsync(CancellationToken cancellationToken = default)
    {
        var client = await CreateAuthenticatedClientAsync(cancellationToken);
        var roles = await client.GetFromJsonAsync<List<RoleViewModel>>("api/roles", cancellationToken);
        return roles ?? new List<RoleViewModel>();
    }

    public async Task<List<AuditLogViewModel>> GetAuditLogsAsync(CancellationToken cancellationToken = default)
    {
        var client = await CreateAuthenticatedClientAsync(cancellationToken);
        var logs = await client.GetFromJsonAsync<List<AuditLogViewModel>>("api/auditlogs", cancellationToken);
        return logs ?? new List<AuditLogViewModel>();
    }

    public async Task<List<AuditLogViewModel>> GetAuditLogsByUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var client = await CreateAuthenticatedClientAsync(cancellationToken);
        var logs = await client.GetFromJsonAsync<List<AuditLogViewModel>>($"api/auditlogs/user/{userId}", cancellationToken);
        return logs ?? new List<AuditLogViewModel>();
    }

    private async Task<HttpClient> CreateAuthenticatedClientAsync(CancellationToken cancellationToken)
    {
        await authStateProvider.EnsureSessionLoadedAsync();

        if (!authState.IsAuthenticated || authState.Session is null)
        {
            throw new InvalidOperationException("User is not authenticated");
        }

        var client = httpClientFactory.CreateClient("InnoTrackApi");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", authState.Session.AccessToken);
        return client;
    }

    private static string? ExtractServerMessage(string rawBody)
    {
        if (string.IsNullOrWhiteSpace(rawBody))
        {
            return null;
        }

        try
        {
            using var document = JsonDocument.Parse(rawBody);
            if (document.RootElement.TryGetProperty("message", out var messageElement))
            {
                return messageElement.GetString();
            }

            if (document.RootElement.TryGetProperty("errors", out var errorsElement) && errorsElement.ValueKind == JsonValueKind.Object)
            {
                var messages = new List<string>();
                foreach (var property in errorsElement.EnumerateObject())
                {
                    if (property.Value.ValueKind != JsonValueKind.Array)
                    {
                        continue;
                    }

                    foreach (var item in property.Value.EnumerateArray())
                    {
                        var text = item.GetString();
                        if (!string.IsNullOrWhiteSpace(text))
                        {
                            messages.Add(text);
                        }
                    }
                }

                if (messages.Count > 0)
                {
                    return string.Join(" ", messages);
                }
            }
        }
        catch (JsonException)
        {
            // Non-JSON body.
        }

        return rawBody;
    }
}
