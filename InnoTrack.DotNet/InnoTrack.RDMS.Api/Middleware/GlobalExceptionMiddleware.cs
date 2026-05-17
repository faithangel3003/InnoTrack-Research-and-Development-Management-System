using System.Net;
using System.Security.Claims;
using InnoTrack.RDMS.Api.Application.Interfaces.Services;

namespace InnoTrack.RDMS.Api.Middleware;

public class GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context, IAuditLogService auditLogService)
    {
        try
        {
            await next(context);
        }
        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
        {
            logger.LogInformation(
                "Request was canceled by the client: {Method} {Path}",
                context.Request.Method,
                context.Request.Path);
        }
        catch (UnauthorizedAccessException ex)
        {
            logger.LogWarning(ex, "Unauthorized access exception");
            await TryLogSecurityEventAsync(context, auditLogService);
            context.Response.StatusCode = context.User?.Identity?.IsAuthenticated == true
                ? (int)HttpStatusCode.Forbidden
                : (int)HttpStatusCode.Unauthorized;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsJsonAsync(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            logger.LogWarning(ex, "Invalid request exception");
            context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsJsonAsync(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled server exception");
            context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsJsonAsync(new { message = "An unexpected error occurred" });
        }
    }

    private async Task TryLogSecurityEventAsync(HttpContext context, IAuditLogService auditLogService)
    {
        try
        {
            var actorId = Guid.TryParse(context.User.FindFirstValue(ClaimTypes.NameIdentifier), out var parsedActorId)
                ? parsedActorId
                : (Guid?)null;
            var organizationId = Guid.TryParse(context.User.FindFirstValue("organization_id"), out var parsedOrganizationId)
                ? parsedOrganizationId
                : (Guid?)null;

            await auditLogService.LogActionAsync(
                userId: actorId,
                actorId: actorId,
                organizationId: organizationId,
                action: "security.unauthorized-access",
                module: "security",
                entityId: null,
                severity: "warning",
                ipAddress: context.Connection.RemoteIpAddress?.ToString(),
                cancellationToken: context.RequestAborted);
        }
        catch (Exception logException)
        {
            logger.LogWarning(logException, "Failed to write unauthorized access audit log");
        }
    }
}
