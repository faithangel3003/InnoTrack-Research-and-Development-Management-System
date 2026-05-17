using System.Text.Json;
using System.Text.RegularExpressions;
using InnoTrack.RDMS.Api.Domain.Enums;
using InnoTrack.RDMS.Api.Security.Events;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace InnoTrack.RDMS.Api.Filters;

public sealed partial class SqlInjectionValidationFilter(ISecurityEventService securityEventService) : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        if (IsAuthLoginRequest(context))
        {
            await next();
            return;
        }

        var suspiciousValue = FindSuspiciousValue(context);
        if (suspiciousValue is null)
        {
            await next();
            return;
        }

        await securityEventService.LogEventAsync(
            SecurityEventType.SuspiciousActivity,
            SecuritySeverity.High,
            context.HttpContext,
            $"Possible SQL injection payload detected: {suspiciousValue}",
            cancellationToken: context.HttpContext.RequestAborted);

        context.Result = new BadRequestObjectResult(new { message = "Suspicious input detected." });
    }

    private static string? FindSuspiciousValue(ActionExecutingContext context)
    {
        foreach (var value in context.RouteData.Values.Values)
        {
            if (value is not null && SqlInjectionPattern().IsMatch(value.ToString() ?? string.Empty))
            {
                return value.ToString();
            }
        }

        foreach (var value in context.HttpContext.Request.Query.SelectMany(entry => entry.Value))
        {
            if (!string.IsNullOrEmpty(value) && SqlInjectionPattern().IsMatch(value))
            {
                return value;
            }
        }

        foreach (var argument in context.ActionArguments.Values)
        {
            var suspicious = ScanValue(argument);
            if (suspicious is not null)
            {
                return suspicious;
            }
        }

        return null;
    }

    private static string? ScanValue(object? value)
    {
        if (value is null)
        {
            return null;
        }

        if (value is CancellationToken || value is IFormFile || value is IFormFileCollection)
        {
            return null;
        }

        if (value is string text && SqlInjectionPattern().IsMatch(text))
        {
            return text;
        }

        if (value.GetType().IsPrimitive || value is Guid || value is DateTime || value is DateTimeOffset || value is TimeSpan || value is decimal)
        {
            return null;
        }

        try
        {
            var json = JsonSerializer.Serialize(value);
            return SqlInjectionPattern().IsMatch(json) ? json : null;
        }
        catch (NotSupportedException)
        {
            return null;
        }
    }

    private static bool IsAuthLoginRequest(ActionExecutingContext context)
    {
        var routeValues = context.RouteData.Values;
        var controller = routeValues.TryGetValue("controller", out var controllerValue) ? controllerValue?.ToString() : null;
        var action = routeValues.TryGetValue("action", out var actionValue) ? actionValue?.ToString() : null;

        return string.Equals(controller, "Auth", StringComparison.OrdinalIgnoreCase)
            && string.Equals(action, "Login", StringComparison.OrdinalIgnoreCase);
    }

    [GeneratedRegex("('\\s*or\\s*'1'='1|;\\s*drop\\s+table|union\\s+select|--|xp_cmdshell|exec\\s*\\(|cast\\s*\\(.+as|waitfor\\s+delay|0x[0-9a-f]+)", RegexOptions.IgnoreCase | RegexOptions.Compiled)]
    private static partial Regex SqlInjectionPattern();
}


