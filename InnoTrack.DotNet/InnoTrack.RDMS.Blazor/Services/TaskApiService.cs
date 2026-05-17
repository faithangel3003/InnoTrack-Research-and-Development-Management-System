using System.Net.Http.Headers;
using System.Net.Http.Json;
using InnoTrack.RDMS.Blazor.Models;

namespace InnoTrack.RDMS.Blazor.Services;

public class TaskApiService(IHttpClientFactory httpClientFactory, AuthState authState, CustomAuthStateProvider authStateProvider)
{
    public async Task<List<ProjectTaskItem>> GetTasksByProjectAsync(Guid projectId, CancellationToken cancellationToken = default)
    {
        var client = await CreateClientAsync(cancellationToken);
        return await client.GetFromJsonAsync<List<ProjectTaskItem>>($"api/projects/{projectId}/tasks", cancellationToken) ?? [];
    }

    public async Task<ProjectTaskItem?> GetTaskByIdAsync(Guid taskId, CancellationToken cancellationToken = default)
    {
        var client = await CreateClientAsync(cancellationToken);
        return await client.GetFromJsonAsync<ProjectTaskItem>($"api/tasks/{taskId}", cancellationToken);
    }

    public async Task<List<ProjectTaskItem>> GetMyTasksAsync(CancellationToken cancellationToken = default)
    {
        var client = await CreateClientAsync(cancellationToken);
        return await client.GetFromJsonAsync<List<ProjectTaskItem>>("api/tasks/my", cancellationToken) ?? [];
    }

    public async Task<ProjectTaskItem> CreateTaskAsync(Guid projectId, CreateTaskRequestModel request, CancellationToken cancellationToken = default)
    {
        var client = await CreateClientAsync(cancellationToken);
        var response = await client.PostAsJsonAsync($"api/projects/{projectId}/tasks", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<ProjectTaskItem>(cancellationToken: cancellationToken)
               ?? throw new InvalidOperationException("Invalid create task response");
    }

    public async Task<ProjectTaskItem> UpdateTaskAsync(Guid taskId, UpdateTaskRequestModel request, CancellationToken cancellationToken = default)
    {
        var client = await CreateClientAsync(cancellationToken);
        var response = await client.PutAsJsonAsync($"api/tasks/{taskId}", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<ProjectTaskItem>(cancellationToken: cancellationToken)
               ?? throw new InvalidOperationException("Invalid update task response");
    }

    public async Task<ProjectTaskItem> UpdateTaskStatusAsync(Guid taskId, UpdateTaskStatusRequestModel request, CancellationToken cancellationToken = default)
    {
        var client = await CreateClientAsync(cancellationToken);
        var response = await client.PatchAsJsonAsync($"api/tasks/{taskId}/status", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<ProjectTaskItem>(cancellationToken: cancellationToken)
               ?? throw new InvalidOperationException("Invalid update task status response");
    }

    public async Task DeleteTaskAsync(Guid taskId, CancellationToken cancellationToken = default)
    {
        var client = await CreateClientAsync(cancellationToken);
        var response = await client.DeleteAsync($"api/tasks/{taskId}", cancellationToken);
        response.EnsureSuccessStatusCode();
    }

    public async Task<List<TaskCommentItem>> GetCommentsAsync(Guid taskId, CancellationToken cancellationToken = default)
    {
        var client = await CreateClientAsync(cancellationToken);
        return await client.GetFromJsonAsync<List<TaskCommentItem>>($"api/tasks/{taskId}/comments", cancellationToken) ?? [];
    }

    public async Task<TaskCommentItem> AddCommentAsync(Guid taskId, CreateTaskCommentRequestModel request, CancellationToken cancellationToken = default)
    {
        var client = await CreateClientAsync(cancellationToken);
        var response = await client.PostAsJsonAsync($"api/tasks/{taskId}/comments", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<TaskCommentItem>(cancellationToken: cancellationToken)
               ?? throw new InvalidOperationException("Invalid add comment response");
    }

    public async Task DeleteCommentAsync(Guid commentId, CancellationToken cancellationToken = default)
    {
        var client = await CreateClientAsync(cancellationToken);
        var response = await client.DeleteAsync($"api/comments/{commentId}", cancellationToken);
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
