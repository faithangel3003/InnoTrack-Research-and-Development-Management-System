using System.Net.Http.Headers;
using System.Net.Http.Json;
using InnoTrack.RDMS.Blazor.Models;

namespace InnoTrack.RDMS.Blazor.Services;

public class ProjectApiService(IHttpClientFactory httpClientFactory, AuthState authState, CustomAuthStateProvider authStateProvider)
{
    public async Task<List<ProjectItem>> GetProjectsAsync(CancellationToken cancellationToken = default)
    {
        var client = await CreateClientAsync(cancellationToken);
        return await client.GetFromJsonAsync<List<ProjectItem>>("api/projects", cancellationToken) ?? [];
    }

    public async Task<ProjectItem?> GetProjectByIdAsync(Guid projectId, CancellationToken cancellationToken = default)
    {
        var client = await CreateClientAsync(cancellationToken);
        return await client.GetFromJsonAsync<ProjectItem>($"api/projects/{projectId}", cancellationToken);
    }

    public async Task<ProjectSummaryItem?> GetProjectSummaryAsync(Guid projectId, CancellationToken cancellationToken = default)
    {
        var client = await CreateClientAsync(cancellationToken);
        return await client.GetFromJsonAsync<ProjectSummaryItem>($"api/projects/{projectId}/summary", cancellationToken);
    }

    public async Task<ProjectItem> CreateProjectAsync(CreateProjectRequestModel request, CancellationToken cancellationToken = default)
    {
        var client = await CreateClientAsync(cancellationToken);
        var response = await client.PostAsJsonAsync("api/projects", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<ProjectItem>(cancellationToken: cancellationToken)
               ?? throw new InvalidOperationException("Invalid create project response");
    }

    public async Task<ProjectItem> UpdateProjectAsync(Guid projectId, UpdateProjectRequestModel request, CancellationToken cancellationToken = default)
    {
        var client = await CreateClientAsync(cancellationToken);
        var response = await client.PutAsJsonAsync($"api/projects/{projectId}", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<ProjectItem>(cancellationToken: cancellationToken)
               ?? throw new InvalidOperationException("Invalid update project response");
    }

    public async Task ChangeProjectStatusAsync(Guid projectId, ChangeProjectStatusRequestModel request, CancellationToken cancellationToken = default)
    {
        var client = await CreateClientAsync(cancellationToken);
        var response = await client.PatchAsJsonAsync($"api/projects/{projectId}/status", request, cancellationToken);
        response.EnsureSuccessStatusCode();
    }

    public async Task DeleteProjectAsync(Guid projectId, CancellationToken cancellationToken = default)
    {
        var client = await CreateClientAsync(cancellationToken);
        var response = await client.DeleteAsync($"api/projects/{projectId}", cancellationToken);
        response.EnsureSuccessStatusCode();
    }

    public async Task<List<ProjectMemberItem>> GetProjectMembersAsync(Guid projectId, CancellationToken cancellationToken = default)
    {
        var client = await CreateClientAsync(cancellationToken);
        return await client.GetFromJsonAsync<List<ProjectMemberItem>>($"api/projects/{projectId}/members", cancellationToken) ?? [];
    }

    public async Task AddProjectMemberAsync(Guid projectId, AddProjectMemberRequestModel request, CancellationToken cancellationToken = default)
    {
        var client = await CreateClientAsync(cancellationToken);
        var response = await client.PostAsJsonAsync($"api/projects/{projectId}/members", request, cancellationToken);
        response.EnsureSuccessStatusCode();
    }

    public async Task RemoveProjectMemberAsync(Guid projectId, Guid userId, CancellationToken cancellationToken = default)
    {
        var client = await CreateClientAsync(cancellationToken);
        var response = await client.DeleteAsync($"api/projects/{projectId}/members/{userId}", cancellationToken);
        response.EnsureSuccessStatusCode();
    }

    public async Task<List<MilestoneItem>> GetMilestonesAsync(Guid projectId, CancellationToken cancellationToken = default)
    {
        var client = await CreateClientAsync(cancellationToken);
        return await client.GetFromJsonAsync<List<MilestoneItem>>($"api/projects/{projectId}/milestones", cancellationToken) ?? [];
    }

    public async Task<MilestoneItem> CreateMilestoneAsync(Guid projectId, CreateMilestoneRequestModel request, CancellationToken cancellationToken = default)
    {
        var client = await CreateClientAsync(cancellationToken);
        var response = await client.PostAsJsonAsync($"api/projects/{projectId}/milestones", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<MilestoneItem>(cancellationToken: cancellationToken)
               ?? throw new InvalidOperationException("Invalid create milestone response");
    }

    public async Task CompleteMilestoneAsync(Guid milestoneId, CancellationToken cancellationToken = default)
    {
        var client = await CreateClientAsync(cancellationToken);
        var response = await client.PatchAsync($"api/milestones/{milestoneId}/complete", null, cancellationToken);
        response.EnsureSuccessStatusCode();
    }

    public async Task DeleteMilestoneAsync(Guid milestoneId, CancellationToken cancellationToken = default)
    {
        var client = await CreateClientAsync(cancellationToken);
        var response = await client.DeleteAsync($"api/milestones/{milestoneId}", cancellationToken);
        response.EnsureSuccessStatusCode();
    }

    private async Task<HttpClient> CreateClientAsync(CancellationToken cancellationToken)
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
}
