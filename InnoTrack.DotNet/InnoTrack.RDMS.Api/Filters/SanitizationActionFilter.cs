using InnoTrack.RDMS.Api.Security.Sanitization;
using InnoTrack.RDMS.Api.Security.Validation;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Filters;

namespace InnoTrack.RDMS.Api.Filters;

public sealed class SanitizationActionFilter(IInputSanitizationService sanitizationService) : IActionFilter
{
    public void OnActionExecuting(ActionExecutingContext context)
    {
        if (!ShouldSanitize(context.HttpContext.Request.Method))
        {
            return;
        }

        foreach (var argument in context.ActionArguments.ToList())
        {
            if (argument.Value is null || argument.Value is IFormFile || argument.Value is IFormFileCollection)
            {
                continue;
            }

            if (IsSensitiveField(argument.Key))
            {
                continue;
            }

            if (argument.Value is string stringValue)
            {
                context.ActionArguments[argument.Key] = sanitizationService.SanitizePlainText(stringValue);
                continue;
            }

            context.ActionArguments[argument.Key] = sanitizationService.SanitizeDto(argument.Value);
        }

        foreach (var queryArgument in context.ActionArguments.Where(entry => entry.Key.Contains("search", StringComparison.OrdinalIgnoreCase) || entry.Key.Equals("q", StringComparison.OrdinalIgnoreCase)).ToList())
        {
            if (queryArgument.Value is string queryValue)
            {
                context.ActionArguments[queryArgument.Key] = SearchQuerySanitizer.Sanitize(queryValue);
            }
        }
    }

    public void OnActionExecuted(ActionExecutedContext context)
    {
    }

    private static bool ShouldSanitize(string method)
    {
        return HttpMethods.IsPost(method) || HttpMethods.IsPut(method) || HttpMethods.IsPatch(method);
    }

    private static bool IsSensitiveField(string fieldName)
    {
        return fieldName.Contains("password", StringComparison.OrdinalIgnoreCase)
            || fieldName.EndsWith("token", StringComparison.OrdinalIgnoreCase)
            || fieldName.Contains("verification", StringComparison.OrdinalIgnoreCase);
    }
}