using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace InnoTrack.RDMS.Api.Filters;

public sealed class ValidateModelFilter : IActionFilter
{
    public void OnActionExecuting(ActionExecutingContext context)
    {
        if (context.ModelState.IsValid)
        {
            return;
        }

        var errors = context.ModelState
            .Where(entry => entry.Value?.Errors.Count > 0)
            .ToDictionary(
                entry => entry.Key,
                entry => entry.Value!.Errors.Select(error => string.IsNullOrWhiteSpace(error.ErrorMessage) ? "Invalid value." : error.ErrorMessage).ToArray());

        context.Result = new BadRequestObjectResult(new
        {
            errors,
            traceId = context.HttpContext.TraceIdentifier,
            timestamp = DateTime.UtcNow,
        });
    }

    public void OnActionExecuted(ActionExecutedContext context)
    {
    }
}