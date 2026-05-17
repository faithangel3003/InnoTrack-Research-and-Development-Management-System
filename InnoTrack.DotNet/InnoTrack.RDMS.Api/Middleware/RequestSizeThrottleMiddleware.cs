using InnoTrack.RDMS.Api.Domain.Enums;
using InnoTrack.RDMS.Api.Security.Events;
using InnoTrack.RDMS.Api.Security.Validation;

namespace InnoTrack.RDMS.Api.Middleware;

public sealed class RequestSizeThrottleMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context, ISecurityEventService securityEventService)
    {
        var sizeLimit = context.Request.HasFormContentType ? InputLimitsConstants.FileUpload : InputLimitsConstants.RequestBody;

        if (context.Request.ContentLength.HasValue && context.Request.ContentLength.Value > sizeLimit)
        {
            await securityEventService.LogEventAsync(
                SecurityEventType.OversizedRequest,
                SecuritySeverity.High,
                context,
                $"Request blocked because payload exceeded {sizeLimit} bytes.",
                cancellationToken: context.RequestAborted);

            context.Response.StatusCode = StatusCodes.Status413PayloadTooLarge;
            await context.Response.WriteAsJsonAsync(new { message = "Payload too large." }, context.RequestAborted);
            return;
        }

        await next(context);
    }
}