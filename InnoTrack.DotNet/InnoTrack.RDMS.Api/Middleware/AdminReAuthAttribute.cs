using System.Security.Claims;
using InnoTrack.RDMS.Api.Domain.Enums;
using InnoTrack.RDMS.Api.Infrastructure.Data;
using InnoTrack.RDMS.Api.Security.Events;
using InnoTrack.RDMS.Api.Security.Password;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;

namespace InnoTrack.RDMS.Api.Middleware;

public sealed class AdminReAuthAttribute : TypeFilterAttribute
{
    public AdminReAuthAttribute() : base(typeof(AdminReAuthFilter))
    {
    }

    private sealed class AdminReAuthFilter(
        AppDbContext dbContext,
        IPasswordHashService passwordHashService,
        ISecurityEventService securityEventService) : IAsyncActionFilter
    {
        public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            var password = context.HttpContext.Request.Headers["X-Admin-Password"].FirstOrDefault();
            var actorClaim = context.HttpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (!Guid.TryParse(actorClaim, out var actorUserId))
            {
                context.Result = new ObjectResult(new { message = "Invalid actor identity." }) { StatusCode = StatusCodes.Status403Forbidden };
                return;
            }

            var actor = await dbContext.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == actorUserId, context.HttpContext.RequestAborted);
            var failed = actor is null || string.IsNullOrWhiteSpace(actor.PasswordHash) || string.IsNullOrWhiteSpace(password) || !passwordHashService.Verify(password, actor.PasswordHash);
            if (!failed)
            {
                await next();
                return;
            }

            await securityEventService.LogEventAsync(
                SecurityEventType.AdminReAuthenticationFailed,
                SecuritySeverity.High,
                context.HttpContext,
                "Sensitive endpoint access denied because admin re-authentication failed.",
                actorUserId,
                context.HttpContext.RequestAborted);

            context.Result = new ObjectResult(new { message = "Admin re-authentication failed." }) { StatusCode = StatusCodes.Status403Forbidden };
        }
    }
}