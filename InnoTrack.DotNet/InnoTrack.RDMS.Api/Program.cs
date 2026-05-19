using System.Text;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using FluentValidation;
using FluentValidation.AspNetCore;
using InnoTrack.RDMS.Api.Application.Interfaces.Repositories;
using InnoTrack.RDMS.Api.Application.Interfaces.Services;
using InnoTrack.RDMS.Api.Application.Services;
using InnoTrack.RDMS.Api.Configuration;
using InnoTrack.RDMS.Api.Domain.Enums;
using InnoTrack.RDMS.Api.Filters;
using InnoTrack.RDMS.Api.Hubs;
using InnoTrack.RDMS.Api.Infrastructure.Data;
using InnoTrack.RDMS.Api.Infrastructure.Repositories;
using InnoTrack.RDMS.Api.Infrastructure.Security;
using InnoTrack.RDMS.Api.Middleware;
using InnoTrack.RDMS.Api.Security.BruteForce;
using InnoTrack.RDMS.Api.Security.Captcha;
using InnoTrack.RDMS.Api.Security.Encryption;
using InnoTrack.RDMS.Api.Security.Events;
using InnoTrack.RDMS.Api.Security.Masking;
using InnoTrack.RDMS.Api.Security.Password;
using InnoTrack.RDMS.Api.Security.Recovery;
using InnoTrack.RDMS.Api.Security.Sanitization;
using InnoTrack.RDMS.Api.Security.Validation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using Pomelo.EntityFrameworkCore.MySql.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

DotEnvBootstrapper.Apply(builder);

builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = InputLimitsConstants.FileUpload;
});

builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = InputLimitsConstants.FileUpload;
    options.MultipartHeadersLengthLimit = InputLimitsConstants.MultipartHeaders;
    options.ValueLengthLimit = InputLimitsConstants.RequestBody;
});

builder.Host.UseSerilog((context, loggerConfig) =>
{
    loggerConfig
        .ReadFrom.Configuration(context.Configuration)
        .Enrich.FromLogContext()
        .WriteTo.Console();
});

builder.Services.AddScoped<ValidateModelFilter>();
builder.Services.AddScoped<SanitizationActionFilter>();
var enableSqlInjectionFilter = builder.Configuration.GetValue<bool>("Security:EnableSqlInjectionFilter");
if (enableSqlInjectionFilter)
{
    builder.Services.AddScoped<SqlInjectionValidationFilter>();
}

builder.Services.AddControllers(options =>
    {
        options.Filters.AddService<ValidateModelFilter>();
        options.Filters.AddService<SanitizationActionFilter>();
        if (enableSqlInjectionFilter)
        {
            options.Filters.AddService<SqlInjectionValidationFilter>();
        }
    })
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    })
    .ConfigureApiBehaviorOptions(options =>
    {
        options.SuppressModelStateInvalidFilter = true;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSignalR();
builder.Services.AddMemoryCache();
builder.Services.AddHttpClient("CloudinaryDocuments", client =>
{
    client.Timeout = TimeSpan.FromMinutes(2);
});
builder.Services.Configure<RecaptchaOptions>(builder.Configuration.GetSection("Recaptcha"));
builder.Services.Configure<PayMongoOptions>(builder.Configuration.GetSection("PayMongo"));
builder.Services.AddHttpClient("Recaptcha");
var payMongoBaseUrl = builder.Configuration["PayMongo:BaseUrl"];
if (string.IsNullOrWhiteSpace(payMongoBaseUrl))
{
    payMongoBaseUrl = "https://api.paymongo.com/v1/";
}
else if (!payMongoBaseUrl.EndsWith('/'))
{
    payMongoBaseUrl += "/";
}

builder.Services.AddHttpClient("PayMongo", client =>
{
    client.BaseAddress = new Uri(payMongoBaseUrl);
    client.Timeout = TimeSpan.FromMinutes(1);
});
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<Program>();
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = async (context, cancellationToken) =>
    {
        var securityEventService = context.HttpContext.RequestServices.GetRequiredService<ISecurityEventService>();
        await securityEventService.LogEventAsync(
            SecurityEventType.SuspiciousActivity,
            SecuritySeverity.Medium,
            context.HttpContext,
            "Rate limit exceeded.",
            cancellationToken: cancellationToken);

        if (!context.HttpContext.Response.HasStarted)
        {
            await context.HttpContext.Response.WriteAsJsonAsync(new { message = "Too many requests. Please try again later." }, cancellationToken);
        }
    };

    options.AddPolicy("LoginPolicy", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: ResolveRateLimitPartitionKey(context),
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0,
                AutoReplenishment = true,
            }));

    options.AddPolicy("LoginPrecheckPolicy", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: ResolveRateLimitPartitionKey(context),
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0,
                AutoReplenishment = true,
            }));

    options.AddPolicy("UploadPolicy", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: ResolveRateLimitPartitionKey(context),
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 20,
                Window = TimeSpan.FromMinutes(10),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0,
                AutoReplenishment = true,
            }));

    options.AddPolicy("UnmaskPolicy", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: ResolveRateLimitPartitionKey(context),
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 3,
                Window = TimeSpan.FromMinutes(10),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0,
                AutoReplenishment = true,
            }));
});

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("DefaultConnection is not configured");

builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseMySql(
        connectionString,
        new MySqlServerVersion(new Version(8, 0, 36))
    );
});
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:SigningKey"]
                                       ?? throw new InvalidOperationException("JWT signing key missing")))
        };

        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrWhiteSpace(accessToken) && path.StartsWithSegments("/hubs/collaboration"))
                {
                    context.Token = accessToken;
                }

                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddScoped<IAuthRepository, AuthRepository>();
builder.Services.AddScoped<IProjectRepository, ProjectRepository>();
builder.Services.AddScoped<ITaskRepository, TaskRepository>();
builder.Services.AddScoped<IMilestoneRepository, MilestoneRepository>();
builder.Services.AddScoped<ITaskCommentRepository, TaskCommentRepository>();
builder.Services.AddScoped<IProjectMemberRepository, ProjectMemberRepository>();
builder.Services.AddScoped<IDocumentRepository, DocumentRepository>();
builder.Services.AddScoped<IChannelRepository, ChannelRepository>();
builder.Services.AddScoped<IMessageRepository, MessageRepository>();
builder.Services.AddScoped<IMessageReactionRepository, MessageReactionRepository>();
builder.Services.AddScoped<IAnnouncementRepository, AnnouncementRepository>();
builder.Services.AddScoped<INotificationRepository, NotificationRepository>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<ITeamRepository, TeamRepository>();
builder.Services.AddScoped<IRoleRepository, RoleRepository>();
builder.Services.AddScoped<IAuditLogRepository, AuditLogRepository>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IProjectService, ProjectService>();
builder.Services.AddScoped<ITaskService, TaskService>();
builder.Services.AddScoped<IMilestoneService, MilestoneService>();
builder.Services.AddScoped<ITaskCommentService, TaskCommentService>();
builder.Services.AddScoped<IProjectMemberService, ProjectMemberService>();
builder.Services.AddScoped<IDocumentService, DocumentService>();
builder.Services.AddScoped<IChannelService, ChannelService>();
builder.Services.AddScoped<IMessageService, MessageService>();
builder.Services.AddScoped<IMessageReactionService, MessageReactionService>();
builder.Services.AddScoped<IAnnouncementService, AnnouncementService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<LocalDocumentStorageService>();
builder.Services.AddScoped<IDocumentStorageService, CloudinaryDocumentStorageService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<ITeamService, TeamService>();
builder.Services.AddScoped<IRoleService, RoleService>();
builder.Services.AddScoped<IAuditLogService, AuditLogService>();
builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
builder.Services.AddScoped<IRecaptchaVerificationService, RecaptchaVerificationService>();
builder.Services.AddScoped<IPayMongoCheckoutService, PayMongoCheckoutService>();
builder.Services.AddSingleton<ILoginCaptchaService, LoginCaptchaService>();
builder.Services.AddScoped<ISuperAdminPortalService, SuperAdminPortalService>();
builder.Services.AddScoped<IPublicOnboardingService, PublicOnboardingService>();
builder.Services.AddScoped<IPasswordHashService, PasswordHashService>();
builder.Services.AddScoped<IInputSanitizationService, InputSanitizationService>();
builder.Services.AddScoped<ISecurityEventService, SecurityEventService>();
builder.Services.AddScoped<IAuthLogService, AuthLogService>();
builder.Services.AddScoped<IUnmaskService, UnmaskService>();
builder.Services.AddScoped<IAccountRecoveryOtpService, AccountRecoveryOtpService>();
builder.Services.AddSingleton<IBruteForceProtectionService, BruteForceProtectionService>();
builder.Services.AddSingleton<IDataMaskingService, DataMaskingService>();
builder.Services.AddSingleton<IEncryptionService, AesEncryptionService>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("BlazorPolicy", policy =>
    {
        var configuredOrigins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>();
        var origins = configuredOrigins is { Length: > 0 }
            ? configuredOrigins
            : [
                builder.Configuration["ClientUrl"] ?? "http://localhost:5173",
                "http://localhost:5174",
                "http://localhost:5175",
                "http://127.0.0.1:5173",
                "http://127.0.0.1:5174",
                "http://127.0.0.1:5175",
                "http://localhost:5133",
                "http://127.0.0.1:5133",
                "https://localhost:5002"
            ];

        var allowedOrigins = new HashSet<string>(origins, StringComparer.OrdinalIgnoreCase);

        policy
            .SetIsOriginAllowed(origin =>
                allowedOrigins.Contains(origin)
                || IsLocalDevelopmentOrigin(origin))
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

var app = builder.Build();

app.UseMiddleware<GlobalExceptionMiddleware>();

app.Use(async (context, next) =>
{
    var origin = context.Request.Headers.Origin.ToString();
    if (!IsLocalDevelopmentOrigin(origin))
    {
        await next();
        return;
    }

    context.Response.Headers["Access-Control-Allow-Origin"] = origin;
    context.Response.Headers["Access-Control-Allow-Credentials"] = "true";
    context.Response.Headers.Append("Vary", "Origin");

    if (HttpMethods.IsOptions(context.Request.Method))
    {
        context.Response.Headers["Access-Control-Allow-Methods"] = context.Request.Headers.AccessControlRequestMethod.ToString() switch
        {
            { Length: > 0 } requestedMethod => requestedMethod,
            _ => "GET,POST,PUT,PATCH,DELETE,OPTIONS"
        };

        context.Response.Headers["Access-Control-Allow-Headers"] = context.Request.Headers.AccessControlRequestHeaders.ToString() switch
        {
            { Length: > 0 } requestedHeaders => requestedHeaders,
            _ => "Content-Type, Authorization"
        };

        context.Response.StatusCode = StatusCodes.Status204NoContent;
        return;
    }

    await next();
});

app.UseSwagger();
app.UseSwaggerUI();

app.UseSerilogRequestLogging();
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseMiddleware<ContentSecurityPolicyMiddleware>();
app.UseMiddleware<RequestSizeThrottleMiddleware>();
app.UseCors("BlazorPolicy");
app.UseRateLimiter();
app.UseAuthentication();
app.UseMiddleware<RoleAuthorizationMiddleware>();
app.UseAuthorization();

app.MapGet("/", () => "InnoTrack API is running");

app.MapControllers();
app.MapHub<CollaborationHub>("/hubs/collaboration");

if (app.Environment.IsDevelopment())
{
    await SuperAdminSchemaBootstrapper.InitializeAsync(app.Services, app.Logger);
}

app.MapGet("/", () => "InnoTrack API is running");

app.Run();

static string ResolveRateLimitPartitionKey(HttpContext context)
{
    var userId = context.User.Identity?.IsAuthenticated == true
        ? context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
        : null;

    return !string.IsNullOrWhiteSpace(userId)
        ? $"user:{userId}"
        : $"ip:{context.Connection.RemoteIpAddress?.ToString() ?? "anonymous"}";
}

static bool IsLocalDevelopmentOrigin(string? origin)
{
    if (string.IsNullOrWhiteSpace(origin))
    {
        return false;
    }

    var normalizedOrigin = origin.Trim().TrimEnd('/');

    return normalizedOrigin.StartsWith("http://localhost:", StringComparison.OrdinalIgnoreCase)
        || normalizedOrigin.StartsWith("https://localhost:", StringComparison.OrdinalIgnoreCase)
        || normalizedOrigin.StartsWith("http://127.0.0.1:", StringComparison.OrdinalIgnoreCase)
        || normalizedOrigin.StartsWith("https://127.0.0.1:", StringComparison.OrdinalIgnoreCase);
}
