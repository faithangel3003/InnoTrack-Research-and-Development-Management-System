using System.Security.Claims;
using InnoTrack.RDMS.Api.Domain.Enums;
using InnoTrack.RDMS.Api.Security.Events;

namespace InnoTrack.RDMS.Api.Middleware;

public sealed class RoleAuthorizationMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context, ISecurityEventService securityEventService)
    {
        if (context.User.Identity?.IsAuthenticated == true)
        {
            context.Items["UserId"] = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
            context.Items["Role"] = context.User.FindFirstValue(ClaimTypes.Role);
            context.Items["OrganizationId"] = context.User.FindFirstValue("organization_id");
        }

        await next(context);

        if (context.Response.StatusCode == StatusCodes.Status401Unauthorized || context.Response.StatusCode == StatusCodes.Status403Forbidden)
        {
            await securityEventService.LogEventAsync(
                context.Response.StatusCode == StatusCodes.Status401Unauthorized ? SecurityEventType.InvalidToken : SecurityEventType.UnauthorizedAccess,
                SecuritySeverity.Medium,
                context,
                $"Request ended with status code {context.Response.StatusCode}.",
                cancellationToken: context.RequestAborted);
        }
    }
}