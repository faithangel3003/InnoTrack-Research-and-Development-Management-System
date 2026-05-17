using InnoTrack.RDMS.Api.Application.Dtos.Security;
using InnoTrack.RDMS.Api.Domain.Entities;
using InnoTrack.RDMS.Api.Domain.Enums;
using InnoTrack.RDMS.Api.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace InnoTrack.RDMS.Api.Security.Events;

public sealed class SecurityEventService(AppDbContext dbContext) : ISecurityEventService
{
    public async Task LogEventAsync(SecurityEventType eventType, SecuritySeverity severity, HttpContext context, string? details, Guid? userId = null, CancellationToken cancellationToken = default)
    {
        var actorUserId = userId;
        if (!actorUserId.HasValue && Guid.TryParse(context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value, out var parsedUserId))
        {
            actorUserId = parsedUserId;
        }

        await LogEventAsync(
            eventType,
            severity,
            context.Request.Path,
            context.Request.Method,
            context.Connection.RemoteIpAddress?.ToString(),
            context.Request.Headers.UserAgent.ToString(),
            details,
            actorUserId,
            cancellationToken);
    }

    public async Task LogEventAsync(SecurityEventType eventType, SecuritySeverity severity, string requestPath, string requestMethod, string? ipAddress, string? userAgent, string? details, Guid? userId = null, CancellationToken cancellationToken = default)
    {
        await dbContext.SecurityEvents.AddAsync(new SecurityEvent
        {
            Id = Guid.NewGuid(),
            EventType = eventType,
            Severity = severity,
            UserId = userId,
            IPAddress = ipAddress,
            UserAgent = userAgent,
            RequestPath = requestPath,
            RequestMethod = requestMethod,
            Details = details,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        }, cancellationToken);

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<List<SecurityEventDto>> GetSecurityEventsAsync(SecurityEventQueryDto query, CancellationToken cancellationToken = default)
    {
        var events = dbContext.SecurityEvents.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.EventType) && Enum.TryParse<SecurityEventType>(query.EventType, true, out var eventType))
        {
            events = events.Where(x => x.EventType == eventType);
        }

        if (!string.IsNullOrWhiteSpace(query.Severity) && Enum.TryParse<SecuritySeverity>(query.Severity, true, out var severity))
        {
            events = events.Where(x => x.Severity == severity);
        }

        if (query.StartDate.HasValue)
        {
            events = events.Where(x => x.CreatedAt >= query.StartDate.Value);
        }

        if (query.EndDate.HasValue)
        {
            events = events.Where(x => x.CreatedAt <= query.EndDate.Value);
        }

        return await events
            .OrderByDescending(x => x.CreatedAt)
            .Take(200)
            .Select(Map)
            .ToListAsync(cancellationToken);
    }

    public Task<List<SecurityEventDto>> GetEventsByUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return dbContext.SecurityEvents.AsNoTracking()
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.CreatedAt)
            .Take(200)
            .Select(Map)
            .ToListAsync(cancellationToken);
    }

    public Task<List<SecurityEventDto>> GetHighSeverityEventsAsync(DateTime? since, CancellationToken cancellationToken = default)
    {
        var query = dbContext.SecurityEvents.AsNoTracking()
            .Where(x => x.Severity == SecuritySeverity.High || x.Severity == SecuritySeverity.Critical);

        if (since.HasValue)
        {
            query = query.Where(x => x.CreatedAt >= since.Value);
        }

        return query
            .OrderByDescending(x => x.CreatedAt)
            .Take(200)
            .Select(Map)
            .ToListAsync(cancellationToken);
    }

    private static System.Linq.Expressions.Expression<Func<SecurityEvent, SecurityEventDto>> Map => entity => new SecurityEventDto
    {
        Id = entity.Id,
        EventType = entity.EventType.ToString(),
        Severity = entity.Severity.ToString(),
        UserId = entity.UserId,
        IPAddress = entity.IPAddress,
        UserAgent = entity.UserAgent,
        RequestPath = entity.RequestPath,
        RequestMethod = entity.RequestMethod,
        Details = entity.Details,
        CreatedAt = entity.CreatedAt,
    };
}