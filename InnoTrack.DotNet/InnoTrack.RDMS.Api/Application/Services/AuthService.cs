using System.IdentityModel.Tokens.Jwt;
using InnoTrack.RDMS.Api.Application.Dtos.Auth;
using InnoTrack.RDMS.Api.Application.Interfaces.Repositories;
using InnoTrack.RDMS.Api.Application.Interfaces.Services;
using InnoTrack.RDMS.Api.Domain.Entities;
using InnoTrack.RDMS.Api.Domain.Enums;
using InnoTrack.RDMS.Api.Infrastructure.Data;
using InnoTrack.RDMS.Api.Security.BruteForce;
using InnoTrack.RDMS.Api.Security.Encryption;
using InnoTrack.RDMS.Api.Security.Events;
using InnoTrack.RDMS.Api.Security.Masking;
using InnoTrack.RDMS.Api.Security.Password;
using InnoTrack.RDMS.Api.Security.Recovery;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace InnoTrack.RDMS.Api.Application.Services;

public class AuthService(
    IAuthRepository authRepository,
    IJwtTokenService jwtTokenService,
    AppDbContext dbContext,
    ILogger<AuthService> logger,
    IPasswordHashService passwordHashService,
    IBruteForceProtectionService bruteForceProtectionService,
    IAuthLogService authLogService,
    ISecurityEventService securityEventService,
    IAccountRecoveryOtpService accountRecoveryOtpService,
    IDataMaskingService dataMaskingService) : IAuthService
{
    private static readonly string[] AllowedSecurityQuestions =
    [
        "What was the name of your first pet?",
        "What city were you born in?",
        "What was the name of your elementary school?",
        "What is your mother's maiden name?",
        "What was the make of your first car?"
    ];

    public async Task ValidateCredentialsAsync(LoginPrecheckRequestDto request, string? ipAddress, string? userAgent, CancellationToken cancellationToken = default)
    {
        _ = await ValidateCredentialsCoreAsync(request.Email, request.Password, ipAddress, userAgent, cancellationToken);
    }

    public async Task<AuthResponseDto> LoginAsync(LoginRequestDto request, string? ipAddress, string? userAgent, CancellationToken cancellationToken = default)
    {
        var validated = await ValidateCredentialsCoreAsync(request.Email, request.Password, ipAddress, userAgent, cancellationToken);
        var email = validated.Email;
        var user = validated.User;

        await bruteForceProtectionService.ClearAttemptsAsync(email, ipAddress, cancellationToken);

        if (passwordHashService.NeedsRehash(user.PasswordHash!))
        {
            user.PasswordHash = passwordHashService.Hash(request.Password);
            user.UpdatedAt = DateTime.UtcNow;
        }

        var roles = await authRepository.GetUserRolesAsync(user.Id, cancellationToken);
        var roleNames = roles.Select(r => RoleNames.FromEnum(r.Role)).Distinct().OrderBy(RolePriority).ToList();
        if (roleNames.Count == 0 && Enum.IsDefined(typeof(AppRole), user.RoleId))
        {
            roleNames.Add(RoleNames.FromEnum((AppRole)user.RoleId));
        }

        var token = jwtTokenService.CreateToken(user, roleNames);

        await authRepository.AddActivityAsync(new ActivityLog
        {
            UserId = user.Id,
            ActorId = user.Id,
            OrganizationId = user.Profile?.OrganizationId,
            Action = "auth.login.success",
            EntityType = "user",
            EntityId = user.Id,
            IpAddress = ipAddress,
            Severity = "info"
        }, cancellationToken);

        await authRepository.SaveChangesAsync(cancellationToken);
        await authLogService.LogAsync(user.Id, email, AuthenticationEventType.LoginSuccess, ipAddress, userAgent, null, cancellationToken);

        return token;
    }

    public async Task<CurrentUserProfileDto?> GetCurrentUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await LoadUserWithProfileAsync(userId, cancellationToken);
        if (user is null)
        {
            return null;
        }

        var roles = await ResolveRoleNamesAsync(user, cancellationToken);
        return MapCurrentUser(user, roles);
    }

    public async Task<CurrentUserProfileDto?> UpdateProfileAsync(Guid userId, UpdateProfileRequestDto request, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var user = await dbContext.Users
            .Include(x => x.Profile)
            .Include(x => x.Organization)
            .Include(x => x.Role)
            .FirstOrDefaultAsync(x => x.Id == userId, cancellationToken);

        if (user is null)
        {
            return null;
        }

        var firstName = request.FirstName.Trim();
        var lastName = request.LastName.Trim();
        var phone = NormalizePhone(request.Phone);
        var now = DateTime.UtcNow;

        user.FirstName = firstName;
        user.LastName = lastName;
        user.Phone = phone;
        user.UpdatedAt = now;

        if (user.Profile is null && user.OrganizationId.HasValue)
        {
            user.Profile = new Profile
            {
                Id = user.Id,
                OrganizationId = user.OrganizationId.Value,
                FullName = $"{firstName} {lastName}".Trim(),
                CreatedAt = now,
                UpdatedAt = now,
            };
            dbContext.Profiles.Add(user.Profile);
        }
        else if (user.Profile is not null)
        {
            user.Profile.FullName = $"{firstName} {lastName}".Trim();
            user.Profile.UpdatedAt = now;
        }

        await authRepository.AddActivityAsync(new ActivityLog
        {
            UserId = user.Id,
            ActorId = user.Id,
            OrganizationId = user.OrganizationId,
            Action = "auth.profile.updated",
            EntityType = "user",
            EntityId = user.Id,
            IpAddress = ipAddress,
            Severity = "info"
        }, cancellationToken);

        await authRepository.SaveChangesAsync(cancellationToken);

        var roles = await ResolveRoleNamesAsync(user, cancellationToken);
        return MapCurrentUser(user, roles);
    }

    public async Task<SecurityQuestionStateDto> GetSecurityQuestionAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await dbContext.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == userId, cancellationToken)
            ?? throw new UnauthorizedAccessException("Account not found");

        return new SecurityQuestionStateDto
        {
            HasSecurityQuestion = !string.IsNullOrWhiteSpace(user.SecurityQuestion) && !string.IsNullOrWhiteSpace(user.SecurityAnswerHash),
            Question = user.SecurityQuestion
        };
    }

    public async Task<SecurityQuestionStateDto> UpdateSecurityQuestionAsync(Guid userId, UpdateSecurityQuestionRequestDto request, string? ipAddress, string? userAgent, CancellationToken cancellationToken = default)
    {
        var user = await dbContext.Users.FirstOrDefaultAsync(x => x.Id == userId, cancellationToken)
            ?? throw new UnauthorizedAccessException("Account not found");

        if (!string.Equals(request.Answer.Trim(), request.ConfirmAnswer.Trim(), StringComparison.Ordinal))
        {
            throw new InvalidOperationException("Security question answers do not match.");
        }

        ValidateSecurityQuestionChoice(request.Question);

        user.SecurityQuestion = request.Question.Trim();
        user.SecurityAnswerHash = passwordHashService.Hash(NormalizeSecurityAnswer(request.Answer));
        user.UpdatedAt = DateTime.UtcNow;

        await authRepository.AddActivityAsync(new ActivityLog
        {
            UserId = user.Id,
            ActorId = user.Id,
            OrganizationId = user.OrganizationId,
            Action = "auth.security-question.updated",
            EntityType = "user",
            EntityId = user.Id,
            IpAddress = ipAddress,
            Severity = "info"
        }, cancellationToken);

        await authRepository.SaveChangesAsync(cancellationToken);
        await authLogService.LogAsync(user.Id, user.Email, AuthenticationEventType.PasswordChanged, ipAddress, userAgent, "Security question updated", cancellationToken);

        return new SecurityQuestionStateDto
        {
            HasSecurityQuestion = true,
            Question = user.SecurityQuestion
        };
    }

    public async Task<ForgotPasswordQuestionResponseDto> GetForgotPasswordQuestionAsync(ForgotPasswordQuestionRequestDto request, CancellationToken cancellationToken = default)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await dbContext.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Email.ToLower() == email, cancellationToken)
            ?? throw new InvalidOperationException("We could not start account recovery for that account.");

        if (string.IsNullOrWhiteSpace(user.SecurityQuestion) || string.IsNullOrWhiteSpace(user.SecurityAnswerHash))
        {
            var otpChallenge = await accountRecoveryOtpService.IssueOtpAsync(user.Email, cancellationToken);

            return new ForgotPasswordQuestionResponseDto
            {
                Email = user.Email,
                RecoveryMethod = "EmailOtp",
                OtpSent = true,
                DeliveryHint = otpChallenge.MaskedDestination,
                OtpExpiresAtUtc = otpChallenge.ExpiresAtUtc,
            };
        }

        return new ForgotPasswordQuestionResponseDto
        {
            Email = user.Email,
            RecoveryMethod = "SecurityQuestion",
            Question = user.SecurityQuestion,
        };
    }

    public async Task ResetPasswordWithSecurityQuestionAsync(ForgotPasswordResetRequestDto request, string? ipAddress, string? userAgent, CancellationToken cancellationToken = default)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await dbContext.Users.FirstOrDefaultAsync(x => x.Email.ToLower() == email, cancellationToken)
            ?? throw new InvalidOperationException("Unable to verify the provided account recovery details.");

        if (string.IsNullOrWhiteSpace(user.SecurityQuestion) || string.IsNullOrWhiteSpace(user.SecurityAnswerHash))
        {
            if (string.IsNullOrWhiteSpace(request.OtpCode) || !await accountRecoveryOtpService.VerifyOtpAsync(user.Email, request.OtpCode, cancellationToken))
            {
                await securityEventService.LogEventAsync(
                    SecurityEventType.SuspiciousActivity,
                    SecuritySeverity.Medium,
                    "/api/auth/forgot-password/reset",
                    HttpMethods.Post,
                    ipAddress,
                    userAgent,
                    $"Invalid recovery OTP submitted for {dataMaskingService.MaskEmail(email)}.",
                    user.Id,
                    cancellationToken);

                throw new InvalidOperationException("Unable to verify the provided account recovery details.");
            }

            await CompleteRecoveredPasswordResetAsync(user, request.NewPassword, ipAddress, cancellationToken);
            await authLogService.LogAsync(user.Id, user.Email, AuthenticationEventType.PasswordChanged, ipAddress, userAgent, "Password reset with email OTP", cancellationToken);
            return;
        }

        if (!string.Equals(request.NewPassword, request.ConfirmNewPassword, StringComparison.Ordinal))
        {
            throw new InvalidOperationException("New password confirmation does not match.");
        }

        if (string.IsNullOrWhiteSpace(request.Answer) || !passwordHashService.Verify(NormalizeSecurityAnswer(request.Answer), user.SecurityAnswerHash))
        {
            await securityEventService.LogEventAsync(
                SecurityEventType.SuspiciousActivity,
                SecuritySeverity.Medium,
                "/api/auth/forgot-password/reset",
                HttpMethods.Post,
                ipAddress,
                userAgent,
                $"Invalid security question answer submitted for {email}.",
                user.Id,
                cancellationToken);

            throw new InvalidOperationException("Unable to verify the provided account recovery details.");
        }

        await CompleteRecoveredPasswordResetAsync(user, request.NewPassword, ipAddress, cancellationToken);
        await authLogService.LogAsync(user.Id, user.Email, AuthenticationEventType.PasswordChanged, ipAddress, userAgent, "Password reset with security question", cancellationToken);
    }

    public async Task ChangePasswordAsync(Guid userId, ChangePasswordRequestDto request, string? ipAddress, string? userAgent, CancellationToken cancellationToken = default)
    {
        var user = await dbContext.Users.FirstOrDefaultAsync(x => x.Id == userId, cancellationToken);
        if (user is null || string.IsNullOrWhiteSpace(user.PasswordHash))
        {
            throw new UnauthorizedAccessException("Account not found");
        }

        if (!passwordHashService.Verify(request.CurrentPassword, user.PasswordHash))
        {
            throw new InvalidOperationException("Current password is incorrect.");
        }

        if (string.Equals(request.CurrentPassword, request.NewPassword, StringComparison.Ordinal))
        {
            throw new InvalidOperationException("New password must be different from the current password.");
        }

        var validation = PasswordPolicyValidator.Validate(request.NewPassword);
        if (!validation.IsValid)
        {
            throw new InvalidOperationException(string.Join(" ", validation.Errors));
        }

        user.PasswordHash = HashPassword(request.NewPassword);
        user.MustChangePassword = false;
        user.UpdatedAt = DateTime.UtcNow;

        await authRepository.AddActivityAsync(new ActivityLog
        {
            UserId = user.Id,
            ActorId = user.Id,
            OrganizationId = user.OrganizationId,
            Action = "auth.password.changed",
            EntityType = "user",
            EntityId = user.Id,
            IpAddress = ipAddress,
            Severity = "info"
        }, cancellationToken);

        await authRepository.SaveChangesAsync(cancellationToken);
        await authLogService.LogAsync(user.Id, user.Email, AuthenticationEventType.PasswordChanged, ipAddress, userAgent, null, cancellationToken);
    }

    public async Task LogoutAsync(Guid userId, string? ipAddress, string? userAgent, CancellationToken cancellationToken = default)
    {
        var email = await dbContext.Users.AsNoTracking()
            .Where(x => x.Id == userId)
            .Select(x => x.Email)
            .FirstOrDefaultAsync(cancellationToken) ?? string.Empty;

        await authRepository.AddActivityAsync(new ActivityLog
        {
            UserId = userId,
            ActorId = userId,
            Action = "auth.logout",
            EntityType = "user",
            EntityId = userId,
            IpAddress = ipAddress,
            Severity = "info"
        }, cancellationToken);

        await authRepository.SaveChangesAsync(cancellationToken);
        await authLogService.LogAsync(userId, email, AuthenticationEventType.Logout, ipAddress, userAgent, null, cancellationToken);
    }

    public string HashPassword(string password)
    {
        var validation = PasswordPolicyValidator.Validate(password);
        if (!validation.IsValid)
        {
            throw new InvalidOperationException(string.Join(" ", validation.Errors));
        }

        return passwordHashService.Hash(password);
    }

    public bool ValidateToken(string token)
    {
        return !string.IsNullOrWhiteSpace(token) && new JwtSecurityTokenHandler().CanReadToken(token);
    }

    private async Task<AppUser?> LoadUserWithProfileAsync(Guid userId, CancellationToken cancellationToken)
    {
        return await dbContext.Users
            .AsNoTracking()
            .Include(x => x.Profile)
            .Include(x => x.Organization)
            .Include(x => x.Role)
            .FirstOrDefaultAsync(x => x.Id == userId, cancellationToken);
    }

    private async Task<List<string>> ResolveRoleNamesAsync(AppUser user, CancellationToken cancellationToken)
    {
        var roles = await authRepository.GetUserRolesAsync(user.Id, cancellationToken);
        var roleNames = roles.Select(r => RoleNames.FromEnum(r.Role)).Distinct().OrderBy(RolePriority).ToList();
        if (roleNames.Count == 0 && Enum.IsDefined(typeof(AppRole), user.RoleId))
        {
            roleNames.Add(RoleNames.FromEnum((AppRole)user.RoleId));
        }

        return roleNames;
    }

    private static CurrentUserProfileDto MapCurrentUser(AppUser user, List<string> roles)
    {
        var fullName = BuildFullName(user);
        var (firstName, lastName) = ResolveNames(user, fullName);

        return new CurrentUserProfileDto
        {
            Id = user.Id,
            Email = user.Email,
            Phone = ResolvePhone(user, roles),
            FirstName = firstName,
            LastName = lastName,
            FullName = fullName,
            Role = roles.FirstOrDefault() ?? user.Role?.RoleName ?? string.Empty,
            OrganizationId = user.Profile?.OrganizationId ?? user.OrganizationId,
            MustChangePassword = user.MustChangePassword,
            Roles = roles
        };
    }

    private static string BuildFullName(AppUser user)
    {
        var fullName = string.Join(' ', new[] { user.FirstName, user.LastName }.Where(value => !string.IsNullOrWhiteSpace(value))).Trim();
        if (!string.IsNullOrWhiteSpace(fullName))
        {
            return fullName;
        }

        return user.Profile?.FullName ?? user.Email;
    }

    private static (string FirstName, string LastName) ResolveNames(AppUser user, string fullName)
    {
        if (!string.IsNullOrWhiteSpace(user.FirstName) || !string.IsNullOrWhiteSpace(user.LastName))
        {
            return (user.FirstName, user.LastName);
        }

        var parts = fullName.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (parts.Length == 0)
        {
            return (string.Empty, string.Empty);
        }

        return (parts[0], parts.Length > 1 ? string.Join(' ', parts.Skip(1)) : string.Empty);
    }

    private static string? ResolvePhone(AppUser user, List<string> roles)
    {
        var directPhone = NormalizePhone(user.Phone);
        if (!string.IsNullOrWhiteSpace(directPhone))
        {
            return directPhone;
        }

        var isSystemAdmin = roles.Any(role => string.Equals(role, RoleNames.SystemAdmin, StringComparison.OrdinalIgnoreCase));
        return isSystemAdmin ? NormalizePhone(user.Organization?.Phone) : null;
    }

    private static string? NormalizePhone(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone))
        {
            return null;
        }

        var digits = new string(phone.Where(char.IsDigit).ToArray());
        return string.IsNullOrWhiteSpace(digits) ? null : digits;
    }

    private static string NormalizeSecurityAnswer(string answer)
    {
        return answer.Trim().ToLowerInvariant();
    }

    private async Task<ValidatedLoginContext> ValidateCredentialsCoreAsync(string rawEmail, string password, string? ipAddress, string? userAgent, CancellationToken cancellationToken)
    {
        var email = rawEmail.Trim().ToLowerInvariant();

        await EnsureNotLockedAsync(email, ipAddress, cancellationToken);

        var user = await authRepository.GetUserByEmailAsync(email, cancellationToken);

        if (user is null || string.IsNullOrWhiteSpace(user.PasswordHash))
        {
            await RecordFailureAndThrowAsync(null, email, ipAddress, userAgent, "Invalid credentials", cancellationToken);
        }

        if (!passwordHashService.Verify(password, user!.PasswordHash!))
        {
            await RecordFailureAndThrowAsync(user.Id, email, ipAddress, userAgent, "Invalid credentials", cancellationToken);
        }

        if (!user.IsActive)
        {
            await ThrowInactiveAccountAsync(user, email, ipAddress, userAgent, cancellationToken);
        }

        return new ValidatedLoginContext(email, user);
    }

    private async Task RecordFailureAndThrowAsync(Guid? userId, string email, string? ipAddress, string? userAgent, string reason, CancellationToken cancellationToken)
    {
        await bruteForceProtectionService.RecordFailedAttemptAsync(email, ipAddress, cancellationToken);
        await authLogService.LogAsync(userId, email, AuthenticationEventType.LoginFailed, ipAddress, userAgent, reason, cancellationToken);

        var attemptCount = bruteForceProtectionService.GetCurrentAttemptCount(email);
        var lockExpiry = await bruteForceProtectionService.GetLockoutExpiryAsync(email, ipAddress, cancellationToken);

        if (lockExpiry.HasValue && lockExpiry.Value > DateTime.UtcNow)
        {
            await authLogService.LogAsync(userId, email, AuthenticationEventType.AccountLocked, ipAddress, userAgent, $"Locked until {lockExpiry.Value:u}", cancellationToken);
            await securityEventService.LogEventAsync(
                SecurityEventType.BruteForceDetected,
                SecuritySeverity.High,
                "/api/auth/login",
                HttpMethods.Post,
                ipAddress,
                userAgent,
                $"Brute force lockout triggered for {email} until {lockExpiry.Value:u}.",
                userId,
                cancellationToken);

            var remaining = (int)Math.Ceiling((lockExpiry.Value - DateTime.UtcNow).TotalSeconds);
            throw new UnauthorizedAccessException($"LOCKED:{remaining}");
        }

        logger.LogWarning("Invalid login attempt for email {Email} (attempt {Count})", email, attemptCount);
        throw new UnauthorizedAccessException($"ATTEMPT:{attemptCount}:Invalid credentials");
    }

    private async Task CompleteRecoveredPasswordResetAsync(AppUser user, string newPassword, string? ipAddress, CancellationToken cancellationToken)
    {
        var validation = PasswordPolicyValidator.Validate(newPassword);
        if (!validation.IsValid)
        {
            throw new InvalidOperationException(string.Join(" ", validation.Errors));
        }

        user.PasswordHash = HashPassword(newPassword);
        user.MustChangePassword = false;
        user.UpdatedAt = DateTime.UtcNow;

        await authRepository.AddActivityAsync(new ActivityLog
        {
            UserId = user.Id,
            ActorId = user.Id,
            OrganizationId = user.OrganizationId,
            Action = "auth.password.recovered",
            EntityType = "user",
            EntityId = user.Id,
            IpAddress = ipAddress,
            Severity = "info"
        }, cancellationToken);

        await authRepository.SaveChangesAsync(cancellationToken);
    }

    private static void ValidateSecurityQuestionChoice(string question)
    {
        if (!AllowedSecurityQuestions.Contains(question.Trim(), StringComparer.Ordinal))
        {
            throw new InvalidOperationException("Please choose one of the supported security questions.");
        }
    }

    private async Task ThrowInactiveAccountAsync(AppUser user, string email, string? ipAddress, string? userAgent, CancellationToken cancellationToken)
    {
        await authLogService.LogAsync(user.Id, email, AuthenticationEventType.LoginFailed, ipAddress, userAgent, "Account inactive", cancellationToken);

        var organization = user.OrganizationId.HasValue
            ? await dbContext.Organizations.AsNoTracking().FirstOrDefaultAsync(x => x.Id == user.OrganizationId.Value, cancellationToken)
            : null;

        if (organization is not null && string.Equals(organization.ApprovalStatus, "Pending", StringComparison.OrdinalIgnoreCase))
        {
            throw new UnauthorizedAccessException("Your company sign-up is still pending super admin approval.");
        }

        if (organization is not null && !organization.Active)
        {
            throw new UnauthorizedAccessException("Your company account is currently inactive.");
        }

        throw new UnauthorizedAccessException("Your account is currently inactive.");
    }

    private async Task EnsureNotLockedAsync(string email, string? ipAddress, CancellationToken cancellationToken)
    {
        var accountLocked = await bruteForceProtectionService.IsAccountLockedAsync(email, cancellationToken);
        var ipLocked = await bruteForceProtectionService.IsIpBlockedAsync(ipAddress, cancellationToken);
        if (accountLocked || ipLocked)
        {
            var expiry = await bruteForceProtectionService.GetLockoutExpiryAsync(email, ipAddress, cancellationToken);
            var remaining = expiry.HasValue ? (int)Math.Ceiling((expiry.Value - DateTime.UtcNow).TotalSeconds) : 60;
            throw new UnauthorizedAccessException($"LOCKED:{Math.Max(0, remaining)}");
        }
    }

    private static int RolePriority(string roleName)
    {
        var normalized = roleName.Replace(" ", string.Empty, StringComparison.OrdinalIgnoreCase);

        return normalized switch
        {
            "SuperAdmin" => 0,
            "SystemAdmin" => 1,
            "ProjectManager" => 2,
            _ => 3
        };
    }

    private sealed record ValidatedLoginContext(string Email, AppUser User);
}
