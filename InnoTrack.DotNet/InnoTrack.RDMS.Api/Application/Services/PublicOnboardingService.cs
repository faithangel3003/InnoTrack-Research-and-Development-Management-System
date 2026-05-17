using InnoTrack.RDMS.Api.Application.Dtos.Auth;
using InnoTrack.RDMS.Api.Application.Interfaces.Services;
using InnoTrack.RDMS.Api.Domain.Entities;
using InnoTrack.RDMS.Api.Domain.Enums;
using InnoTrack.RDMS.Api.Infrastructure.Data;
using InnoTrack.RDMS.Api.Security.Encryption;
using Microsoft.EntityFrameworkCore;

namespace InnoTrack.RDMS.Api.Application.Services;

public class PublicOnboardingService(
    AppDbContext dbContext,
    IAuthService authService,
    IAuditLogService auditLogService,
    IPayMongoCheckoutService payMongoCheckoutService,
    IEncryptionService encryptionService) : IPublicOnboardingService
{
    private const string PendingPaymentStatus = "PendingPayment";
    private const string CompletedStatus = "Completed";
    private static readonly string[] AllowedPlans = ["Starter", "Professional", "Enterprise"];
    private static readonly string[] AllowedPaymentMethods = ["Card", "GCash", "GrabPay", "Maya", "PayMongo"];

    public async Task<PublicOnboardingCheckoutSessionResponseDto> CreateCheckoutSessionAsync(
        PublicOnboardingRequestDto request,
        string? ipAddress,
        string clientBaseUrl,
        CancellationToken cancellationToken = default)
    {
        var companyName = request.CompanyName.Trim();
        var email = request.Email.Trim().ToLowerInvariant();
        await EnsureRegistrationAvailableAsync(companyName, email, cancellationToken);

        var now = DateTime.UtcNow;
        var plan = NormalizePlan(request.PlanId);
        var paymentMethod = NormalizePaymentMethod(request.PaymentMethod);
        var pending = new PendingPublicOnboarding
        {
            Id = Guid.NewGuid(),
            CompanyName = companyName,
            Industry = request.Industry.Trim(),
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            Email = email,
            PhoneNumber = NormalizeOptionalDigits(request.PhoneNumber),
            EncryptedPassword = encryptionService.Encrypt(request.Password),
            PlanId = plan,
            PaymentMethod = paymentMethod.DisplayName,
            Amount = ResolvePlanAmount(plan),
            Status = PendingPaymentStatus,
            ExpiresAt = now.AddHours(24),
            CreatedAt = now,
            UpdatedAt = now,
        };

        dbContext.PendingPublicOnboardings.Add(pending);
        await dbContext.SaveChangesAsync(cancellationToken);

        return await CreatePayMongoCheckoutAsync(pending, paymentMethod, clientBaseUrl, cancellationToken);
    }

    public async Task<PublicOnboardingCheckoutSessionResponseDto> RetryCheckoutSessionAsync(
        Guid pendingOnboardingId,
        RetryPublicOnboardingCheckoutRequestDto request,
        string? ipAddress,
        string clientBaseUrl,
        CancellationToken cancellationToken = default)
    {
        var pending = await dbContext.PendingPublicOnboardings.FirstOrDefaultAsync(x => x.Id == pendingOnboardingId, cancellationToken)
            ?? throw new InvalidOperationException("This checkout session no longer exists. Start signup again.");

        if (string.Equals(pending.Status, CompletedStatus, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("This signup has already been completed. You can sign in with the company admin account.");
        }

        if (pending.ExpiresAt <= DateTime.UtcNow)
        {
            pending.Status = "Expired";
            pending.UpdatedAt = DateTime.UtcNow;
            await dbContext.SaveChangesAsync(cancellationToken);
            throw new InvalidOperationException("This checkout session expired. Start signup again.");
        }

        await EnsureRegistrationAvailableAsync(pending.CompanyName, pending.Email, cancellationToken);

        var paymentMethod = NormalizePaymentMethod(request.PaymentMethod);
        pending.PaymentMethod = paymentMethod.DisplayName;
        pending.UpdatedAt = DateTime.UtcNow;

        return await CreatePayMongoCheckoutAsync(pending, paymentMethod, clientBaseUrl, cancellationToken);
    }

    public async Task<PublicOnboardingResponseDto> CompleteOnboardingAsync(Guid pendingOnboardingId, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var pending = await dbContext.PendingPublicOnboardings.FirstOrDefaultAsync(x => x.Id == pendingOnboardingId, cancellationToken)
            ?? throw new InvalidOperationException("This signup checkout could not be found.");

        if (string.Equals(pending.Status, CompletedStatus, StringComparison.OrdinalIgnoreCase))
        {
            return BuildCompletedResponse(pending);
        }

        if (pending.ExpiresAt <= DateTime.UtcNow)
        {
            pending.Status = "Expired";
            pending.UpdatedAt = DateTime.UtcNow;
            await dbContext.SaveChangesAsync(cancellationToken);
            throw new InvalidOperationException("The PayMongo checkout session expired. Return to checkout and try again.");
        }

        if (string.IsNullOrWhiteSpace(pending.PayMongoCheckoutSessionId))
        {
            throw new InvalidOperationException("No PayMongo checkout session was created for this signup.");
        }

        var checkoutSession = await payMongoCheckoutService.GetCheckoutSessionAsync(pending.PayMongoCheckoutSessionId, cancellationToken);
        var successfulPayment = checkoutSession.Payments.FirstOrDefault(payment => string.Equals(payment.Status, "paid", StringComparison.OrdinalIgnoreCase));

        if (successfulPayment is null)
        {
            pending.Status = MapPendingStatus(checkoutSession);
            pending.GatewayMessage = BuildPendingGatewayMessage(checkoutSession);
            pending.UpdatedAt = DateTime.UtcNow;
            await dbContext.SaveChangesAsync(cancellationToken);
            throw new InvalidOperationException(BuildPendingPaymentMessage(checkoutSession));
        }

        await EnsureRegistrationAvailableAsync(pending.CompanyName, pending.Email, cancellationToken);

        var now = DateTime.UtcNow;
        var subscriptionEndDate = ResolveSubscriptionEndDate(now, "Monthly");
        var organizationId = Guid.NewGuid();
        var adminUserId = Guid.NewGuid();
        var subscriptionId = Guid.NewGuid();
        var paymentReference = BuildPaymentReference();

        var organization = new Organization
        {
            Id = organizationId,
            Name = pending.CompanyName,
            Plan = pending.PlanId,
            ApprovalStatus = "Approved",
            Active = true,
            Email = pending.Email,
            Phone = pending.PhoneNumber,
            ContactPerson = $"{pending.FirstName} {pending.LastName}".Trim(),
            ContactRole = "Organization Admin",
            Industry = pending.Industry,
            CreatedAt = now,
            UpdatedAt = now,
        };

        var adminUser = new AppUser
        {
            Id = adminUserId,
            FirstName = pending.FirstName,
            LastName = pending.LastName,
            Email = pending.Email,
            Phone = pending.PhoneNumber,
            PasswordHash = authService.HashPassword(encryptionService.Decrypt(pending.EncryptedPassword)),
            RoleId = (int)AppRole.SystemAdmin,
            OrganizationId = organizationId,
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now,
        };

        var profile = new Profile
        {
            Id = adminUserId,
            FullName = $"{pending.FirstName} {pending.LastName}".Trim(),
            OrganizationId = organizationId,
            CreatedAt = now,
            UpdatedAt = now,
        };

        var userRole = new UserRole
        {
            Id = Guid.NewGuid(),
            UserId = adminUserId,
            OrganizationId = organizationId,
            Role = AppRole.SystemAdmin,
            CreatedAt = now,
            UpdatedAt = now,
        };

        var subscription = new OrganizationSubscription
        {
            Id = subscriptionId,
            OrganizationId = organizationId,
            Plan = pending.PlanId,
            Status = "Active",
            StartDate = now,
            EndDate = subscriptionEndDate,
            BillingCycle = "Monthly",
            Amount = pending.Amount,
            CreatedAt = now,
            UpdatedAt = now,
        };

        var payment = new PaymentTransaction
        {
            Id = Guid.NewGuid(),
            OrganizationId = organizationId,
            SubscriptionId = subscriptionId,
            ReferenceNumber = paymentReference,
            Amount = pending.Amount,
            Method = pending.PaymentMethod,
            Status = "Paid",
            Description = $"Initial {pending.PlanId} subscription payment via PayMongo",
            BillingPeriodStart = now,
            BillingPeriodEnd = subscriptionEndDate,
            GatewayMessage = BuildSuccessfulGatewayMessage(checkoutSession, successfulPayment, pending.PaymentMethod),
            PaidAt = now,
            CreatedAt = now,
            UpdatedAt = now,
        };

        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

        dbContext.Organizations.Add(organization);
        dbContext.Users.Add(adminUser);
        dbContext.Profiles.Add(profile);
        dbContext.UserRoles.Add(userRole);
        dbContext.OrganizationSubscriptions.Add(subscription);
        dbContext.PaymentTransactions.Add(payment);

        pending.Status = CompletedStatus;
        pending.OrganizationId = organizationId;
        pending.AdminUserId = adminUserId;
        pending.PaymentReference = paymentReference;
        pending.PayMongoPaymentId = successfulPayment.Id;
        pending.PayMongoReferenceNumber = successfulPayment.ReferenceNumber;
        pending.GatewayMessage = payment.GatewayMessage;
        pending.PaidAt = payment.PaidAt;
        pending.UpdatedAt = now;

        await dbContext.SaveChangesAsync(cancellationToken);

        await auditLogService.LogActionAsync(
            userId: adminUserId,
            actorId: adminUserId,
            organizationId: organizationId,
            action: "auth.signup.completed",
            module: "auth",
            entityId: organizationId,
            severity: "info",
            ipAddress: ipAddress,
            cancellationToken: cancellationToken);

        await transaction.CommitAsync(cancellationToken);

        return new PublicOnboardingResponseDto
        {
            OrganizationId = organizationId,
            AdminUserId = adminUserId,
            CompanyName = organization.Name,
            AdminEmail = adminUser.Email,
            Plan = pending.PlanId,
            PaymentReference = paymentReference,
            ApprovalStatus = organization.ApprovalStatus,
        };
    }

    private async Task<PublicOnboardingCheckoutSessionResponseDto> CreatePayMongoCheckoutAsync(
        PendingPublicOnboarding pending,
        PaymentMethodMapping paymentMethod,
        string clientBaseUrl,
        CancellationToken cancellationToken)
    {
        var description = $"Initial {pending.PlanId} monthly subscription for {pending.CompanyName}";
        var result = await payMongoCheckoutService.CreateCheckoutSessionAsync(
            new PayMongoCreateCheckoutSessionRequest(
                CustomerName: $"{pending.FirstName} {pending.LastName}".Trim(),
                CustomerEmail: pending.Email,
                CustomerPhone: pending.PhoneNumber,
                Description: description,
                LineItemName: $"InnoTrack {pending.PlanId} Plan",
                AmountInCentavos: decimal.ToInt64(decimal.Round(pending.Amount * 100m, 0, MidpointRounding.AwayFromZero)),
                PaymentMethodTypes: paymentMethod.PayMongoTypes,
                SuccessUrl: BuildClientUrl(clientBaseUrl, $"/signup/complete?pending={pending.Id:D}"),
                CancelUrl: BuildClientUrl(clientBaseUrl, $"/signup/checkout?pending={pending.Id:D}&paymentStatus=cancelled"),
                Metadata: new Dictionary<string, string>
                {
                    ["pending_onboarding_id"] = pending.Id.ToString("D"),
                    ["company_name"] = pending.CompanyName,
                    ["plan"] = pending.PlanId,
                    ["payment_method"] = paymentMethod.DisplayName,
                }),
            cancellationToken);

        pending.Status = PendingPaymentStatus;
        pending.PaymentMethod = paymentMethod.DisplayName;
        pending.PayMongoCheckoutSessionId = result.CheckoutSessionId;
        pending.PayMongoCheckoutUrl = result.CheckoutUrl;
        pending.GatewayMessage = $"PayMongo checkout session {result.CheckoutSessionId} created for {paymentMethod.DisplayName}.";
        pending.UpdatedAt = DateTime.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);

        return new PublicOnboardingCheckoutSessionResponseDto
        {
            PendingOnboardingId = pending.Id,
            CheckoutSessionId = result.CheckoutSessionId,
            CheckoutUrl = result.CheckoutUrl,
        };
    }

    private async Task EnsureRegistrationAvailableAsync(string companyName, string email, CancellationToken cancellationToken)
    {
        if (await dbContext.Organizations.AnyAsync(x => x.Name == companyName, cancellationToken))
        {
            throw new InvalidOperationException("A company with this name already exists");
        }

        if (await dbContext.Users.AnyAsync(x => x.Email == email, cancellationToken))
        {
            throw new InvalidOperationException("An account with this email already exists");
        }
    }

    private static string NormalizeOptionalDigits(string? phoneNumber)
    {
        if (string.IsNullOrWhiteSpace(phoneNumber))
        {
            return null!;
        }

        var digits = new string(phoneNumber.Where(char.IsDigit).ToArray());
        return string.IsNullOrWhiteSpace(digits) ? null! : digits;
    }

    private static string NormalizePlan(string planId)
    {
        var normalized = planId.Trim().ToLowerInvariant() switch
        {
            "starter" or "free" => "Starter",
            "professional" or "pro" => "Professional",
            "enterprise" => "Enterprise",
            _ => throw new InvalidOperationException("Invalid plan selected")
        };

        if (!AllowedPlans.Contains(normalized, StringComparer.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Invalid plan selected");
        }

        return normalized;
    }

    private static PaymentMethodMapping NormalizePaymentMethod(string paymentMethod)
    {
        var normalized = paymentMethod.Trim().ToLowerInvariant() switch
        {
            "card" => new PaymentMethodMapping("Card", ["card"]),
            "gcash" => new PaymentMethodMapping("GCash", ["gcash"]),
            "grabpay" => new PaymentMethodMapping("GrabPay", ["grab_pay"]),
            "maya" => new PaymentMethodMapping("Maya", ["paymaya"]),
            "paymongo" => new PaymentMethodMapping("PayMongo", ["card", "gcash", "grab_pay", "paymaya"]),
            _ => throw new InvalidOperationException("Unsupported payment method")
        };

        if (!AllowedPaymentMethods.Contains(normalized.DisplayName, StringComparer.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Unsupported payment method");
        }

        return normalized;
    }

    private static decimal ResolvePlanAmount(string plan)
    {
        return plan switch
        {
            "Starter" => 999m,
            "Professional" => 2499m,
            "Enterprise" => 4999m,
            _ => 999m,
        };
    }

    private static DateTime ResolveSubscriptionEndDate(DateTime startDate, string billingCycle)
    {
        return string.Equals(billingCycle, "Yearly", StringComparison.OrdinalIgnoreCase)
            ? startDate.AddYears(1)
            : startDate.AddMonths(1);
    }

    private static string BuildPendingPaymentMessage(PayMongoCheckoutSessionStatus checkoutSession)
    {
        if (string.Equals(checkoutSession.Status, "expired", StringComparison.OrdinalIgnoreCase))
        {
            return "The PayMongo checkout session expired. Return to checkout and try again.";
        }

        return "Payment has not been completed in PayMongo yet. Finish the checkout and try again.";
    }

    private static string MapPendingStatus(PayMongoCheckoutSessionStatus checkoutSession)
    {
        if (string.Equals(checkoutSession.Status, "expired", StringComparison.OrdinalIgnoreCase))
        {
            return "Expired";
        }

        return PendingPaymentStatus;
    }

    private static string BuildPendingGatewayMessage(PayMongoCheckoutSessionStatus checkoutSession)
    {
        return $"PayMongo session {checkoutSession.CheckoutSessionId} is {checkoutSession.Status} (payment intent: {checkoutSession.PaymentIntentStatus ?? "unknown"}).";
    }

    private static string BuildSuccessfulGatewayMessage(PayMongoCheckoutSessionStatus checkoutSession, PayMongoPaymentRecord payment, string paymentMethod)
    {
        var reference = string.IsNullOrWhiteSpace(payment.ReferenceNumber) ? payment.Id : payment.ReferenceNumber;
        return $"Processed via PayMongo using {paymentMethod}. Checkout session: {checkoutSession.CheckoutSessionId}. Payment reference: {reference}.";
    }

    private static string BuildClientUrl(string clientBaseUrl, string relativePath)
    {
        return $"{clientBaseUrl.TrimEnd('/')}{relativePath}";
    }

    private static PublicOnboardingResponseDto BuildCompletedResponse(PendingPublicOnboarding pending)
    {
        if (!pending.OrganizationId.HasValue || !pending.AdminUserId.HasValue || string.IsNullOrWhiteSpace(pending.PaymentReference))
        {
            throw new InvalidOperationException("This signup completed without a stored onboarding result.");
        }

        return new PublicOnboardingResponseDto
        {
            OrganizationId = pending.OrganizationId.Value,
            AdminUserId = pending.AdminUserId.Value,
            CompanyName = pending.CompanyName,
            AdminEmail = pending.Email,
            Plan = pending.PlanId,
            PaymentReference = pending.PaymentReference,
            ApprovalStatus = "Approved",
        };
    }

    private static string BuildPaymentReference()
    {
        return $"INNO-{DateTime.UtcNow:yyyyMMddHHmmss}-{Guid.NewGuid().ToString("N")[..8].ToUpperInvariant()}";
    }

    private sealed record PaymentMethodMapping(string DisplayName, IReadOnlyList<string> PayMongoTypes);
}