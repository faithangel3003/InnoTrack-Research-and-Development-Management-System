using System.Globalization;
using System.Text;
using ClosedXML.Excel;
using InnoTrack.RDMS.Api.Application.Dtos.SuperAdmin;
using InnoTrack.RDMS.Api.Application.Interfaces.Services;
using InnoTrack.RDMS.Api.Domain.Entities;
using InnoTrack.RDMS.Api.Domain.Enums;
using InnoTrack.RDMS.Api.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace InnoTrack.RDMS.Api.Application.Services;

public class SuperAdminPortalService(AppDbContext dbContext, IAuditLogService auditLogService, IAuthService authService) : ISuperAdminPortalService
{
    private static readonly string[] AllowedSubscriptionPlans = ["Starter", "Professional", "Enterprise"];
    private static readonly string[] AllowedSubscriptionStatuses = ["Active", "Trial", "Expired", "Cancelled"];
    private static readonly string[] AllowedBillingCycles = ["Monthly", "Yearly"];

    public async Task<DashboardStatsDto> GetDashboardAsync(CancellationToken cancellationToken = default)
    {
        var organizations = await dbContext.Organizations.AsNoTracking().OrderByDescending(x => x.CreatedAt).ToListAsync(cancellationToken);
        var subscriptions = await dbContext.OrganizationSubscriptions.AsNoTracking().ToListAsync(cancellationToken);
        var payments = await dbContext.PaymentTransactions.AsNoTracking().ToListAsync(cancellationToken);
        var users = await dbContext.Users.AsNoTracking().Where(x => x.IsActive).ToListAsync(cancellationToken);
        var primaryUsers = await GetPrimaryUsersByOrganizationAsync(cancellationToken);

        var revenueSeries = BuildRevenueSeries(DateTime.UtcNow.AddMonths(-5), DateTime.UtcNow, payments, subscriptions, allowSubscriptionFallback: true);
        var currentMonthRevenue = revenueSeries.LastOrDefault()?.Revenue ?? 0;
        var previousMonthRevenue = revenueSeries.Count > 1 ? revenueSeries[^2].Revenue : 0;
        var growth = previousMonthRevenue <= 0
            ? (currentMonthRevenue > 0 ? 100 : 0)
            : Math.Round(((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100m, 1);

        var activeDistribution = subscriptions
            .Where(x => IsOneOf(x.Status, "Active", "Trial"))
            .GroupBy(x => NormalizePlan(x.Plan))
            .Select(group => new SubscriptionDistributionDto
            {
                Plan = group.Key,
                Count = group.Count(),
                Percentage = 0
            })
            .OrderByDescending(x => x.Count)
            .ToList();

        var activeDistributionTotal = activeDistribution.Sum(x => x.Count);
        foreach (var item in activeDistribution)
        {
            item.Percentage = activeDistributionTotal == 0
                ? 0
                : Math.Round(item.Count / (decimal)activeDistributionTotal * 100m, 1);
        }

        var organizationById = organizations.ToDictionary(x => x.Id);

        return new DashboardStatsDto
        {
            TotalCompanies = organizations.Count,
            ActiveCompanies = organizations.Count(x => ResolveCompanyStatus(x) == "Active"),
            NewCompaniesThisMonth = organizations.Count(x => x.CreatedAt >= StartOfMonth(DateTime.UtcNow)),
            TotalSubscriptions = subscriptions.Count,
            ActiveSubscriptions = subscriptions.Count(x => IsOneOf(x.Status, "Active")),
            TrialSubscriptions = subscriptions.Count(x => IsOneOf(x.Status, "Trial")),
            TotalUsers = users.Count,
            TotalRevenue = revenueSeries.Sum(x => x.Revenue),
            MonthlyRevenue = currentMonthRevenue,
            RevenueGrowthPercent = growth,
            AvgRevenuePerMonth = revenueSeries.Count == 0 ? 0 : Math.Round(revenueSeries.Average(x => x.Revenue), 2),
            RevenueByMonth = revenueSeries,
            SubscriptionDistribution = activeDistribution,
            RecentCompanies = organizations.Take(5).Select(org => new RecentCompanyDto
            {
                Id = org.Id,
                Name = org.Name,
                Email = ResolveCompanyEmail(org, primaryUsers),
                Status = ResolveCompanyStatus(org),
                Plan = ResolveCurrentPlan(org.Id, subscriptions, org.Plan),
                RegisteredAt = org.CreatedAt
            }).ToList(),
            RecentPayments = payments
                .OrderByDescending(x => PaymentDate(x))
                .Take(5)
                .Select(payment => new RecentPaymentDto
                {
                    Id = payment.Id,
                    CompanyId = payment.OrganizationId,
                    CompanyName = organizationById.TryGetValue(payment.OrganizationId, out var organization) ? organization.Name : "Unknown Company",
                    Amount = payment.Amount,
                    Status = NormalizePaymentStatus(payment.Status),
                    Date = PaymentDate(payment)
                })
                .ToList()
        };
    }

    public async Task<PagedResponseDto<CompanyListItemDto>> GetCompaniesAsync(CompanyQueryDto query, CancellationToken cancellationToken = default)
    {
        var organizations = await dbContext.Organizations.AsNoTracking().OrderByDescending(x => x.CreatedAt).ToListAsync(cancellationToken);
        var subscriptions = await dbContext.OrganizationSubscriptions.AsNoTracking().ToListAsync(cancellationToken);
        var primaryUsers = await GetPrimaryUsersByOrganizationAsync(cancellationToken);

        var items = organizations.Select(org => MapCompany(org, subscriptions, primaryUsers)).ToList();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim();
            items = items.Where(item =>
                    item.Name.Contains(term, StringComparison.OrdinalIgnoreCase)
                    || item.Email.Contains(term, StringComparison.OrdinalIgnoreCase)
                    || item.ContactName.Contains(term, StringComparison.OrdinalIgnoreCase)
                    || item.ContactEmail.Contains(term, StringComparison.OrdinalIgnoreCase))
                .ToList();
        }

        if (!string.IsNullOrWhiteSpace(query.Status))
        {
            items = items.Where(item => item.Status.Equals(query.Status.Trim(), StringComparison.OrdinalIgnoreCase)).ToList();
        }

        var page = NormalizePage(query.Page);
        var pageSize = NormalizePageSize(query.PageSize, 10, 100);
        var total = items.Count;

        return new PagedResponseDto<CompanyListItemDto>
        {
            Page = page,
            PageSize = pageSize,
            Total = total,
            Items = items.Skip((page - 1) * pageSize).Take(pageSize).ToList()
        };
    }

    public async Task<CompanyDetailDto?> GetCompanyByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var organization = await dbContext.Organizations.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (organization is null)
        {
            return null;
        }

        var subscription = await dbContext.OrganizationSubscriptions.AsNoTracking().FirstOrDefaultAsync(x => x.OrganizationId == id, cancellationToken);
        var payments = await dbContext.PaymentTransactions.AsNoTracking()
            .Where(x => x.OrganizationId == id)
            .OrderByDescending(x => x.PaidAt ?? x.CreatedAt)
            .Take(10)
            .ToListAsync(cancellationToken);
        var primaryUsers = await GetPrimaryUsersByOrganizationAsync(cancellationToken);
        var company = MapCompany(organization, subscription is null ? [] : [subscription], primaryUsers);
        var lastActive = await dbContext.ActivityLogs.AsNoTracking()
            .Where(x => x.OrganizationId == id)
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => (DateTime?)x.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        return new CompanyDetailDto
        {
            Id = company.Id,
            Name = company.Name,
            Email = company.Email,
            ContactName = company.ContactName,
            ContactEmail = company.ContactEmail,
            Status = company.Status,
            Plan = company.Plan,
            SubscriptionStatus = company.SubscriptionStatus,
            RegisteredAt = company.RegisteredAt,
            Phone = organization.Phone,
            Address = organization.Address,
            ContactRole = organization.ContactRole,
            Industry = organization.Industry,
            LastActiveAt = lastActive,
            Subscription = subscription is null ? null : MapSubscription(subscription, organization.Name, company.Email),
            Payments = payments.Select(payment => MapPayment(payment, organization.Name, company.Email)).ToList()
        };
    }

    public async Task<CompanyDetailDto> CreateCompanyAsync(CreateCompanyDto request, Guid actorUserId, string? ipAddress, CancellationToken cancellationToken = default)
    {
        ValidateCompanyMutation(request);

        var name = request.Name.Trim();
        var email = request.Email.Trim();
        if (await dbContext.Organizations.AnyAsync(x => x.Name == name, cancellationToken))
        {
            throw new InvalidOperationException("A company with this name already exists");
        }

        if (await dbContext.Users.AnyAsync(x => x.Email == email, cancellationToken))
        {
            throw new InvalidOperationException("An account with this email already exists");
        }

        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 12)
        {
            throw new InvalidOperationException("Company admin password must be at least 12 characters long.");
        }

        var normalizedPlan = NormalizePlan(request.Plan);
        var normalizedSubscriptionStatus = NormalizeSubscriptionStatus(request.SubscriptionStatus);
        var billingCycle = NormalizeBillingCycle(request.BillingCycle);
        var subscriptionAmount = ResolveSubscriptionAmount(normalizedPlan, billingCycle);
        var now = DateTime.UtcNow;
        var (firstName, lastName) = SplitContactName(request.ContactName);
        var organization = new Organization
        {
            Id = Guid.NewGuid(),
            Name = name,
            Plan = normalizedPlan,
            ApprovalStatus = "Approved",
            Active = request.IsActive,
            Email = email,
            Phone = NormalizeOptional(request.Phone),
            Address = NormalizeOptional(request.Address),
            ContactPerson = request.ContactName.Trim(),
            ContactRole = ResolveCompanyAdminContactRole(request.ContactRole),
            Industry = NormalizeOptional(request.Industry),
            CreatedAt = now,
            UpdatedAt = now,
        };

        var adminUser = new AppUser
        {
            Id = Guid.NewGuid(),
            FirstName = firstName,
            LastName = lastName,
            Email = email,
            Phone = NormalizeOptional(request.Phone),
            PasswordHash = authService.HashPassword(request.Password),
            MustChangePassword = false,
            RoleId = (int)AppRole.SystemAdmin,
            OrganizationId = organization.Id,
            IsActive = request.IsActive,
            CreatedAt = now,
            UpdatedAt = now,
        };

        var profile = new Profile
        {
            Id = adminUser.Id,
            FullName = request.ContactName.Trim(),
            OrganizationId = organization.Id,
            CreatedAt = now,
            UpdatedAt = now,
        };

        var userRole = new UserRole
        {
            Id = Guid.NewGuid(),
            UserId = adminUser.Id,
            OrganizationId = organization.Id,
            Role = AppRole.SystemAdmin,
            CreatedAt = now,
            UpdatedAt = now,
        };

        var subscription = new OrganizationSubscription
        {
            Id = Guid.NewGuid(),
            OrganizationId = organization.Id,
            Plan = normalizedPlan,
            Status = normalizedSubscriptionStatus,
            StartDate = now,
            EndDate = ResolveSubscriptionEndDate(now, billingCycle),
            BillingCycle = billingCycle,
            Amount = subscriptionAmount,
            CreatedAt = now,
            UpdatedAt = now,
        };

        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

        dbContext.Organizations.Add(organization);
        dbContext.Users.Add(adminUser);
        dbContext.Profiles.Add(profile);
        dbContext.UserRoles.Add(userRole);
        dbContext.OrganizationSubscriptions.Add(subscription);
        await SyncSubscriptionPaymentAsync(subscription, now, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        await auditLogService.LogActionAsync(
            userId: adminUser.Id,
            actorId: actorUserId,
            organizationId: organization.Id,
            action: "company.create",
            module: "companies",
            entityId: organization.Id,
            severity: "info",
            ipAddress: ipAddress,
            cancellationToken: cancellationToken);

        await transaction.CommitAsync(cancellationToken);

        return await GetCompanyByIdAsync(organization.Id, cancellationToken)
            ?? throw new InvalidOperationException("Created company could not be loaded");
    }

    public async Task<CompanyDetailDto?> UpdateCompanyAsync(Guid id, UpdateCompanyDto request, Guid actorUserId, string? ipAddress, CancellationToken cancellationToken = default)
    {
        ValidateCompanyMutation(request);

        var organization = await dbContext.Organizations.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (organization is null)
        {
            return null;
        }

        var name = request.Name.Trim();
        var email = request.Email.Trim();
        if (await dbContext.Organizations.AnyAsync(x => x.Id != id && x.Name == name, cancellationToken))
        {
            throw new InvalidOperationException("A company with this name already exists");
        }

        if (await dbContext.Users.AnyAsync(x => x.OrganizationId != id && x.Email == email, cancellationToken))
        {
            throw new InvalidOperationException("An account with this email already exists");
        }

        var normalizedPlan = NormalizePlan(request.Plan);
        var normalizedSubscriptionStatus = NormalizeSubscriptionStatus(request.SubscriptionStatus);
        var billingCycle = NormalizeBillingCycle(request.BillingCycle);
        var subscriptionAmount = ResolveSubscriptionAmount(normalizedPlan, billingCycle);
        var now = DateTime.UtcNow;

        if (request.IsActive)
        {
            organization.ApprovalStatus = "Approved";
        }

        var effectiveActiveState = string.Equals(organization.ApprovalStatus, "Approved", StringComparison.OrdinalIgnoreCase) && request.IsActive;

        organization.Name = name;
        organization.Plan = normalizedPlan;
        organization.Active = effectiveActiveState;
        organization.Email = email;
        organization.Phone = NormalizeOptional(request.Phone);
        organization.Address = NormalizeOptional(request.Address);
        organization.ContactPerson = request.ContactName.Trim();
        organization.ContactRole = ResolveCompanyAdminContactRole(request.ContactRole);
        organization.Industry = NormalizeOptional(request.Industry);
        organization.UpdatedAt = now;

        var users = await dbContext.Users.Where(x => x.OrganizationId == id).ToListAsync(cancellationToken);
        var (firstName, lastName) = SplitContactName(request.ContactName);
        var primaryUser = users
            .OrderBy(x => x.RoleId == (int)AppRole.SystemAdmin ? 0 : 1)
            .ThenBy(x => x.CreatedAt)
            .FirstOrDefault();
        if (primaryUser is not null)
        {
            primaryUser.FirstName = firstName;
            primaryUser.LastName = lastName;
            primaryUser.Email = email;
        }

        foreach (var user in users)
        {
            user.IsActive = effectiveActiveState;
            user.UpdatedAt = now;
        }

        if (primaryUser is not null)
        {
            var profile = await dbContext.Profiles.FirstOrDefaultAsync(x => x.Id == primaryUser.Id, cancellationToken);
            if (profile is not null)
            {
                profile.FullName = request.ContactName.Trim();
                profile.OrganizationId = id;
                profile.UpdatedAt = now;
            }
        }

        var subscription = await dbContext.OrganizationSubscriptions.FirstOrDefaultAsync(x => x.OrganizationId == id, cancellationToken);
        if (subscription is null)
        {
            subscription = new OrganizationSubscription
            {
                Id = Guid.NewGuid(),
                OrganizationId = id,
                StartDate = now,
                CreatedAt = now,
            };

            dbContext.OrganizationSubscriptions.Add(subscription);
        }

        subscription.Plan = normalizedPlan;
        subscription.Status = normalizedSubscriptionStatus;
        subscription.BillingCycle = billingCycle;
        subscription.Amount = subscriptionAmount;
        subscription.EndDate = ResolveSubscriptionEndDate(subscription.StartDate, billingCycle);
        subscription.UpdatedAt = now;

        await SyncSubscriptionPaymentAsync(subscription, now, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        await auditLogService.LogActionAsync(
            userId: users.FirstOrDefault()?.Id,
            actorId: actorUserId,
            organizationId: id,
            action: "company.update",
            module: "companies",
            entityId: id,
            severity: "info",
            ipAddress: ipAddress,
            cancellationToken: cancellationToken);

        return await GetCompanyByIdAsync(id, cancellationToken);
    }

    public async Task<bool> DeleteCompanyAsync(Guid id, Guid actorUserId, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var organization = await dbContext.Organizations.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (organization is null)
        {
            return false;
        }

        var userIds = await dbContext.Users
            .Where(x => x.OrganizationId == id)
            .Select(x => x.Id)
            .ToListAsync(cancellationToken);

        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

        await auditLogService.LogActionAsync(
            userId: null,
            actorId: actorUserId,
            organizationId: id,
            action: "company.delete",
            module: "companies",
            entityId: id,
            severity: "warning",
            ipAddress: ipAddress,
            cancellationToken: cancellationToken);

        dbContext.Organizations.Remove(organization);
        await dbContext.SaveChangesAsync(cancellationToken);

        if (userIds.Count > 0)
        {
            var orphanedUsers = await dbContext.Users
                .Where(x => userIds.Contains(x.Id))
                .ToListAsync(cancellationToken);

            if (orphanedUsers.Count > 0)
            {
                dbContext.Users.RemoveRange(orphanedUsers);
                await dbContext.SaveChangesAsync(cancellationToken);
            }
        }

        await transaction.CommitAsync(cancellationToken);
        return true;
    }

    public async Task<bool> ApproveCompanyAsync(Guid id, Guid actorUserId, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var organization = await dbContext.Organizations.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (organization is null)
        {
            return false;
        }

        var users = await dbContext.Users.Where(x => x.OrganizationId == id).ToListAsync(cancellationToken);
        var now = DateTime.UtcNow;

        organization.ApprovalStatus = "Approved";
        organization.Active = true;
        organization.UpdatedAt = now;

        foreach (var user in users)
        {
            user.IsActive = true;
            user.UpdatedAt = now;
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        await auditLogService.LogActionAsync(
            userId: users.FirstOrDefault()?.Id,
            actorId: actorUserId,
            organizationId: organization.Id,
            action: "company.approve",
            module: "companies",
            entityId: organization.Id,
            severity: "info",
            ipAddress: ipAddress,
            cancellationToken: cancellationToken);

        return true;
    }

    public async Task<bool> SetCompanyActiveStateAsync(Guid id, bool isActive, Guid actorUserId, string? ipAddress, CancellationToken cancellationToken = default)
    {
        var organization = await dbContext.Organizations.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (organization is null)
        {
            return false;
        }

        var users = await dbContext.Users.Where(x => x.OrganizationId == id).ToListAsync(cancellationToken);
        if (isActive)
        {
            organization.ApprovalStatus = "Approved";
        }

        organization.Active = isActive;
        organization.UpdatedAt = DateTime.UtcNow;

        foreach (var user in users)
        {
            user.IsActive = isActive;
            user.UpdatedAt = DateTime.UtcNow;
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        await auditLogService.LogActionAsync(
            userId: users.FirstOrDefault()?.Id,
            actorId: actorUserId,
            organizationId: organization.Id,
            action: isActive ? "company.activate" : "company.deactivate",
            module: "companies",
            entityId: organization.Id,
            severity: isActive ? "info" : "warning",
            ipAddress: ipAddress,
            cancellationToken: cancellationToken);

        return true;
    }

    public async Task<PagedResponseDto<SubscriptionItemDto>> GetSubscriptionsAsync(SubscriptionQueryDto query, CancellationToken cancellationToken = default)
    {
        var organizations = await dbContext.Organizations.AsNoTracking().ToDictionaryAsync(x => x.Id, cancellationToken);
        var primaryUsers = await GetPrimaryUsersByOrganizationAsync(cancellationToken);
        var items = await dbContext.OrganizationSubscriptions.AsNoTracking()
            .OrderByDescending(x => x.UpdatedAt)
            .ToListAsync(cancellationToken);

        var mapped = items.Select(subscription =>
        {
            var organization = organizations[subscription.OrganizationId];
            return MapSubscription(subscription, organization.Name, ResolveCompanyEmail(organization, primaryUsers));
        }).ToList();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim();
            mapped = mapped.Where(item =>
                    item.CompanyName.Contains(term, StringComparison.OrdinalIgnoreCase)
                    || item.CompanyEmail.Contains(term, StringComparison.OrdinalIgnoreCase))
                .ToList();
        }

        if (!string.IsNullOrWhiteSpace(query.Status))
        {
            mapped = mapped.Where(item => item.Status.Equals(NormalizeSubscriptionStatus(query.Status), StringComparison.OrdinalIgnoreCase)).ToList();
        }

        if (!string.IsNullOrWhiteSpace(query.Plan))
        {
            mapped = mapped.Where(item => item.Plan.Equals(NormalizePlan(query.Plan), StringComparison.OrdinalIgnoreCase)).ToList();
        }

        if (query.CompanyId.HasValue)
        {
            mapped = mapped.Where(item => item.CompanyId == query.CompanyId.Value).ToList();
        }

        var page = NormalizePage(query.Page);
        var pageSize = NormalizePageSize(query.PageSize, 10, 100);

        return new PagedResponseDto<SubscriptionItemDto>
        {
            Page = page,
            PageSize = pageSize,
            Total = mapped.Count,
            Items = mapped.Skip((page - 1) * pageSize).Take(pageSize).ToList()
        };
    }

    public async Task<SubscriptionSummaryDto> GetSubscriptionSummaryAsync(CancellationToken cancellationToken = default)
    {
        var subscriptions = await dbContext.OrganizationSubscriptions.AsNoTracking().ToListAsync(cancellationToken);
        return new SubscriptionSummaryDto
        {
            Total = subscriptions.Count,
            Active = subscriptions.Count(x => IsOneOf(x.Status, "Active")),
            Trial = subscriptions.Count(x => IsOneOf(x.Status, "Trial")),
            Expired = subscriptions.Count(x => IsOneOf(x.Status, "Expired")),
            Cancelled = subscriptions.Count(x => IsOneOf(x.Status, "Cancelled"))
        };
    }

    public async Task<SubscriptionItemDto?> UpdateSubscriptionAsync(Guid id, UpdateSubscriptionDto request, Guid actorUserId, string? ipAddress, CancellationToken cancellationToken = default)
    {
        ValidateSubscriptionUpdate(request);

        var subscription = await dbContext.OrganizationSubscriptions.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (subscription is null)
        {
            return null;
        }

        var normalizedPlan = NormalizePlan(request.Plan);
        var normalizedStatus = NormalizeSubscriptionStatus(request.Status);
        var billingCycle = NormalizeBillingCycle(request.BillingCycle);
        var subscriptionAmount = ResolveSubscriptionAmount(normalizedPlan, billingCycle);
        var updatedAt = DateTime.UtcNow;

        subscription.Plan = normalizedPlan;
        subscription.Status = normalizedStatus;
        subscription.StartDate = request.StartDate;
        subscription.EndDate = request.EndDate;
        subscription.BillingCycle = billingCycle;
        subscription.Amount = subscriptionAmount;
        subscription.UpdatedAt = updatedAt;

        await SyncSubscriptionPaymentAsync(subscription, updatedAt, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        var organization = await dbContext.Organizations.AsNoTracking().FirstAsync(x => x.Id == subscription.OrganizationId, cancellationToken);
        var primaryUsers = await GetPrimaryUsersByOrganizationAsync(cancellationToken);
        await auditLogService.LogActionAsync(
            userId: null,
            actorId: actorUserId,
            organizationId: subscription.OrganizationId,
            action: "subscription.update",
            module: "subscriptions",
            entityId: subscription.Id,
            severity: "info",
            ipAddress: ipAddress,
            cancellationToken: cancellationToken);

        return MapSubscription(subscription, organization.Name, ResolveCompanyEmail(organization, primaryUsers));
    }

    public async Task<PagedResponseDto<PaymentItemDto>> GetPaymentsAsync(PaymentQueryDto query, CancellationToken cancellationToken = default)
    {
        var organizations = await dbContext.Organizations.AsNoTracking().ToDictionaryAsync(x => x.Id, cancellationToken);
        var primaryUsers = await GetPrimaryUsersByOrganizationAsync(cancellationToken);
        var payments = await dbContext.PaymentTransactions.AsNoTracking()
            .OrderByDescending(x => x.PaidAt ?? x.CreatedAt)
            .ToListAsync(cancellationToken);

        var mapped = payments.Select(payment =>
        {
            var organization = organizations.TryGetValue(payment.OrganizationId, out var company)
                ? company
                : new Organization { Id = payment.OrganizationId, Name = "Unknown Company" };
            return MapPayment(payment, organization.Name, ResolveCompanyEmail(organization, primaryUsers));
        }).ToList();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim();
            mapped = mapped.Where(item =>
                    item.ReferenceNumber.Contains(term, StringComparison.OrdinalIgnoreCase)
                    || item.CompanyName.Contains(term, StringComparison.OrdinalIgnoreCase)
                    || item.CompanyEmail.Contains(term, StringComparison.OrdinalIgnoreCase))
                .ToList();
        }

        if (!string.IsNullOrWhiteSpace(query.Status))
        {
            mapped = mapped.Where(item => item.Status.Equals(NormalizePaymentStatus(query.Status), StringComparison.OrdinalIgnoreCase)).ToList();
        }

        if (!string.IsNullOrWhiteSpace(query.Method))
        {
            mapped = mapped.Where(item => item.Method.Equals(NormalizePaymentMethod(query.Method), StringComparison.OrdinalIgnoreCase)).ToList();
        }

        if (query.StartDate.HasValue)
        {
            mapped = mapped.Where(item => item.Date >= query.StartDate.Value.Date).ToList();
        }

        if (query.EndDate.HasValue)
        {
            mapped = mapped.Where(item => item.Date < query.EndDate.Value.Date.AddDays(1)).ToList();
        }

        var page = NormalizePage(query.Page);
        var pageSize = NormalizePageSize(query.PageSize, 20, 100);

        return new PagedResponseDto<PaymentItemDto>
        {
            Page = page,
            PageSize = pageSize,
            Total = mapped.Count,
            Items = mapped.Skip((page - 1) * pageSize).Take(pageSize).ToList()
        };
    }

    public async Task<PaymentSummaryDto> GetPaymentSummaryAsync(CancellationToken cancellationToken = default)
    {
        var payments = await dbContext.PaymentTransactions.AsNoTracking().ToListAsync(cancellationToken);
        return new PaymentSummaryDto
        {
            Total = payments.Count,
            TotalRevenue = payments.Where(x => IsOneOf(x.Status, "Paid")).Sum(x => x.Amount),
            Pending = payments.Count(x => IsOneOf(x.Status, "Pending")),
            Failed = payments.Count(x => IsOneOf(x.Status, "Failed"))
        };
    }

    public async Task<ReportPreviewDto> GetReportPreviewAsync(ReportPreviewQueryDto query, CancellationToken cancellationToken = default)
    {
        var type = NormalizeReportType(query.Type);
        if (query.EndDate.Date < query.StartDate.Date)
        {
            throw new InvalidOperationException("End date must be after start date");
        }

        var organizations = await dbContext.Organizations.AsNoTracking().ToDictionaryAsync(x => x.Id, cancellationToken);
        var payments = await dbContext.PaymentTransactions.AsNoTracking().ToListAsync(cancellationToken);
        var subscriptions = await dbContext.OrganizationSubscriptions.AsNoTracking().ToListAsync(cancellationToken);

        var rangeStart = query.StartDate.Date;
        var rangeEnd = query.EndDate.Date.AddDays(1).AddTicks(-1);
        var rangedPayments = payments
            .Where(payment => PaymentDate(payment) >= rangeStart && PaymentDate(payment) <= rangeEnd)
            .ToList();

        if (!string.IsNullOrWhiteSpace(query.Status))
        {
            var normalizedStatus = NormalizePaymentStatus(query.Status);
            rangedPayments = rangedPayments.Where(payment => NormalizePaymentStatus(payment.Status) == normalizedStatus).ToList();
        }

        var paidPayments = rangedPayments.Where(payment => NormalizePaymentStatus(payment.Status) == "Paid").ToList();
        var monthlyBreakdown = BuildRevenueSeries(rangeStart, rangeEnd, rangedPayments, subscriptions, allowSubscriptionFallback: type == "revenue");

        return new ReportPreviewDto
        {
            Type = type,
            StartDate = query.StartDate.Date,
            EndDate = query.EndDate.Date,
            TotalRevenue = monthlyBreakdown.Sum(x => x.Revenue),
            TotalCompanies = type == "revenue" && paidPayments.Count == 0
                ? subscriptions.Count(subscription => SubscriptionOverlaps(subscription, rangeStart, rangeEnd))
                : paidPayments.Select(payment => payment.OrganizationId).Distinct().Count(),
            TotalInvoices = rangedPayments.Count,
            Paid = rangedPayments.Count(payment => NormalizePaymentStatus(payment.Status) == "Paid"),
            Pending = rangedPayments.Count(payment => NormalizePaymentStatus(payment.Status) == "Pending"),
            Failed = rangedPayments.Count(payment => NormalizePaymentStatus(payment.Status) == "Failed"),
            MonthlyBreakdown = monthlyBreakdown,
            StatusDistribution = rangedPayments
                .GroupBy(payment => NormalizePaymentStatus(payment.Status))
                .Select(group => new StatusCountDto
                {
                    Status = group.Key,
                    Count = group.Count()
                })
                .OrderByDescending(x => x.Count)
                .ToList(),
            TopCompanyPayments = paidPayments
                .GroupBy(payment => organizations.TryGetValue(payment.OrganizationId, out var organization) ? organization.Name : "Unknown Company")
                .Select(group => new TopCompanyPaymentDto
                {
                    CompanyName = group.Key,
                    Amount = group.Sum(item => item.Amount),
                    TransactionCount = group.Count()
                })
                .OrderByDescending(x => x.Amount)
                .Take(5)
                .ToList()
        };
    }

    public async Task<GeneratedFileDto> DownloadReportAsync(string type, ReportDownloadQueryDto query, CancellationToken cancellationToken = default)
    {
        var normalizedType = NormalizeReportType(type);
        var preview = await GetReportPreviewAsync(new ReportPreviewQueryDto
        {
            Type = normalizedType,
            StartDate = query.StartDate,
            EndDate = query.EndDate,
            Status = query.Status
        }, cancellationToken);

        var normalizedFormat = query.Format.Trim().ToLowerInvariant();
        return normalizedFormat switch
        {
            "xlsx" or "excel" => BuildExcelReport(preview),
            "pdf" => BuildPdfReport(preview),
            _ => throw new InvalidOperationException("Unsupported report format")
        };
    }

    private async Task<Dictionary<Guid, AppUser>> GetPrimaryUsersByOrganizationAsync(CancellationToken cancellationToken)
    {
        var users = await dbContext.Users.AsNoTracking()
            .Where(user => user.OrganizationId != null)
            .OrderBy(user => user.RoleId == (int)AppRole.SystemAdmin ? 0 : 1)
            .ThenBy(user => user.CreatedAt)
            .ToListAsync(cancellationToken);

        return users
            .Where(user => user.OrganizationId.HasValue)
            .GroupBy(user => user.OrganizationId!.Value)
            .ToDictionary(group => group.Key, group => group.First());
    }

    private static CompanyListItemDto MapCompany(Organization organization, IEnumerable<OrganizationSubscription> subscriptions, IReadOnlyDictionary<Guid, AppUser> primaryUsers)
    {
        var subscription = subscriptions.FirstOrDefault(item => item.OrganizationId == organization.Id);
        return new CompanyListItemDto
        {
            Id = organization.Id,
            Name = organization.Name,
            Email = ResolveCompanyEmail(organization, primaryUsers),
            ContactName = ResolveContactName(organization, primaryUsers),
            ContactEmail = ResolveContactEmail(organization, primaryUsers),
            Status = ResolveCompanyStatus(organization),
            Plan = subscription is null ? NormalizePlan(organization.Plan) : NormalizePlan(subscription.Plan),
            SubscriptionStatus = subscription is null ? (organization.Active ? "Active" : "Cancelled") : NormalizeSubscriptionStatus(subscription.Status),
            RegisteredAt = organization.CreatedAt
        };
    }

    private static SubscriptionItemDto MapSubscription(OrganizationSubscription subscription, string companyName, string companyEmail)
    {
        return new SubscriptionItemDto
        {
            Id = subscription.Id,
            CompanyId = subscription.OrganizationId,
            CompanyName = companyName,
            CompanyEmail = companyEmail,
            Plan = NormalizePlan(subscription.Plan),
            Status = NormalizeSubscriptionStatus(subscription.Status),
            StartDate = subscription.StartDate,
            EndDate = subscription.EndDate,
            BillingCycle = NormalizeBillingCycle(subscription.BillingCycle),
            Amount = subscription.Amount
        };
    }

    private static PaymentItemDto MapPayment(PaymentTransaction payment, string companyName, string companyEmail)
    {
        return new PaymentItemDto
        {
            Id = payment.Id,
            CompanyId = payment.OrganizationId,
            CompanyName = companyName,
            CompanyEmail = companyEmail,
            ReferenceNumber = payment.ReferenceNumber,
            Amount = payment.Amount,
            Method = NormalizePaymentMethod(payment.Method),
            Status = NormalizePaymentStatus(payment.Status),
            Date = PaymentDate(payment),
            Description = payment.Description,
            BillingPeriodStart = payment.BillingPeriodStart,
            BillingPeriodEnd = payment.BillingPeriodEnd,
            GatewayMessage = payment.GatewayMessage
        };
    }

    private static void ValidateSubscriptionUpdate(UpdateSubscriptionDto request)
    {
        if (request.EndDate <= request.StartDate)
        {
            throw new InvalidOperationException("End date must be after start date");
        }

        if (!AllowedSubscriptionPlans.Contains(NormalizePlan(request.Plan), StringComparer.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Invalid subscription plan");
        }

        if (!AllowedSubscriptionStatuses.Contains(NormalizeSubscriptionStatus(request.Status), StringComparer.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Invalid subscription status");
        }

        if (!AllowedBillingCycles.Contains(NormalizeBillingCycle(request.BillingCycle), StringComparer.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Invalid billing cycle");
        }
    }

    private static void ValidateCompanyMutation(CreateCompanyDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || request.Name.Trim().Length < 2)
        {
            throw new InvalidOperationException("Company name must be at least 2 characters");
        }

        if (string.IsNullOrWhiteSpace(request.ContactName) || request.ContactName.Trim().Length < 2)
        {
            throw new InvalidOperationException("Contact name must be at least 2 characters");
        }

        if (string.IsNullOrWhiteSpace(request.Email))
        {
            throw new InvalidOperationException("Company admin email is required");
        }

        if (!AllowedSubscriptionPlans.Contains(NormalizePlan(request.Plan), StringComparer.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Invalid company plan");
        }

        if (!AllowedSubscriptionStatuses.Contains(NormalizeSubscriptionStatus(request.SubscriptionStatus), StringComparer.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Invalid subscription status");
        }

        if (!AllowedBillingCycles.Contains(NormalizeBillingCycle(request.BillingCycle), StringComparer.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Invalid billing cycle");
        }

        if (request.Amount < 0)
        {
            throw new InvalidOperationException("Amount cannot be negative");
        }
    }

    private static List<RevenuePointDto> BuildRevenueSeries(
        DateTime startDate,
        DateTime endDate,
        IReadOnlyCollection<PaymentTransaction> payments,
        IReadOnlyCollection<OrganizationSubscription> subscriptions,
        bool allowSubscriptionFallback)
    {
        var months = new List<DateTime>();
        var cursor = StartOfMonth(startDate);
        var last = StartOfMonth(endDate);
        while (cursor <= last)
        {
            months.Add(cursor);
            cursor = cursor.AddMonths(1);
        }

        var paidPayments = payments.Where(payment => NormalizePaymentStatus(payment.Status) == "Paid").ToList();

        if (paidPayments.Count > 0)
        {
            return months.Select(month => new RevenuePointDto
            {
                Month = month.ToString("MMM yyyy", CultureInfo.InvariantCulture),
                Revenue = paidPayments
                    .Where(payment => StartOfMonth(PaymentDate(payment)) == month)
                    .Sum(payment => payment.Amount)
            }).ToList();
        }

        if (!allowSubscriptionFallback)
        {
            return months.Select(month => new RevenuePointDto
            {
                Month = month.ToString("MMM yyyy", CultureInfo.InvariantCulture),
                Revenue = 0
            }).ToList();
        }

        return months.Select(month => new RevenuePointDto
        {
            Month = month.ToString("MMM yyyy", CultureInfo.InvariantCulture),
            Revenue = subscriptions
                .Where(subscription => IsOneOf(subscription.Status, "Active", "Trial") && SubscriptionOverlaps(subscription, month, EndOfMonth(month)))
                .Sum(NormalizeMonthlyAmount)
        }).ToList();
    }

    private static bool SubscriptionOverlaps(OrganizationSubscription subscription, DateTime startDate, DateTime endDate)
    {
        return subscription.StartDate <= endDate && subscription.EndDate >= startDate;
    }

    private static GeneratedFileDto BuildExcelReport(ReportPreviewDto preview)
    {
        using var workbook = new XLWorkbook();

        var summary = workbook.Worksheets.Add("Summary");
        summary.Cell(1, 1).Value = $"{CultureInfo.InvariantCulture.TextInfo.ToTitleCase(preview.Type)} Report";
        summary.Cell(2, 1).Value = "Period";
        summary.Cell(2, 2).Value = $"{preview.StartDate:yyyy-MM-dd} to {preview.EndDate:yyyy-MM-dd}";
        summary.Cell(4, 1).Value = "Total Revenue";
        summary.Cell(4, 2).Value = preview.TotalRevenue;
        summary.Cell(5, 1).Value = "Total Companies";
        summary.Cell(5, 2).Value = preview.TotalCompanies;
        summary.Cell(6, 1).Value = "Total Invoices";
        summary.Cell(6, 2).Value = preview.TotalInvoices;
        summary.Cell(7, 1).Value = "Paid";
        summary.Cell(7, 2).Value = preview.Paid;
        summary.Cell(8, 1).Value = "Pending";
        summary.Cell(8, 2).Value = preview.Pending;
        summary.Cell(9, 1).Value = "Failed";
        summary.Cell(9, 2).Value = preview.Failed;
        summary.Column(2).Style.NumberFormat.Format = "#,##0.00";
        summary.Columns().AdjustToContents();

        if (preview.MonthlyBreakdown.Count > 0)
        {
            var monthly = workbook.Worksheets.Add("Monthly Breakdown");
            monthly.Cell(1, 1).Value = "Month";
            monthly.Cell(1, 2).Value = "Revenue";
            for (var index = 0; index < preview.MonthlyBreakdown.Count; index++)
            {
                monthly.Cell(index + 2, 1).Value = preview.MonthlyBreakdown[index].Month;
                monthly.Cell(index + 2, 2).Value = preview.MonthlyBreakdown[index].Revenue;
            }

            monthly.Column(2).Style.NumberFormat.Format = "#,##0.00";
            monthly.Columns().AdjustToContents();
        }

        if (preview.StatusDistribution.Count > 0)
        {
            var statuses = workbook.Worksheets.Add("Status Distribution");
            statuses.Cell(1, 1).Value = "Status";
            statuses.Cell(1, 2).Value = "Count";
            for (var index = 0; index < preview.StatusDistribution.Count; index++)
            {
                statuses.Cell(index + 2, 1).Value = preview.StatusDistribution[index].Status;
                statuses.Cell(index + 2, 2).Value = preview.StatusDistribution[index].Count;
            }

            statuses.Columns().AdjustToContents();
        }

        if (preview.TopCompanyPayments.Count > 0)
        {
            var topCompanies = workbook.Worksheets.Add("Top Companies");
            topCompanies.Cell(1, 1).Value = "Company";
            topCompanies.Cell(1, 2).Value = "Amount";
            topCompanies.Cell(1, 3).Value = "Transactions";
            for (var index = 0; index < preview.TopCompanyPayments.Count; index++)
            {
                topCompanies.Cell(index + 2, 1).Value = preview.TopCompanyPayments[index].CompanyName;
                topCompanies.Cell(index + 2, 2).Value = preview.TopCompanyPayments[index].Amount;
                topCompanies.Cell(index + 2, 3).Value = preview.TopCompanyPayments[index].TransactionCount;
            }

            topCompanies.Column(2).Style.NumberFormat.Format = "#,##0.00";
            topCompanies.Columns().AdjustToContents();
        }

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);

        return new GeneratedFileDto
        {
            FileName = BuildReportFileName(preview.Type, preview.StartDate, preview.EndDate, "xlsx"),
            ContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            Content = stream.ToArray()
        };
    }

    private static GeneratedFileDto BuildPdfReport(ReportPreviewDto preview)
    {
        return new GeneratedFileDto
        {
            FileName = BuildReportFileName(preview.Type, preview.StartDate, preview.EndDate, "pdf"),
            ContentType = "application/pdf",
            Content = CreatePdf(preview)
        };
    }

    private static byte[] CreatePdf(ReportPreviewDto preview)
    {
        const int pageWidth = 842;
        const int margin = 42;
        const int cardGap = 12;
        const int cardWidth = 244;
        const int cardHeight = 64;
        const int firstRowY = 430;
        const int secondRowY = 354;
        const int panelGap = 18;
        const int leftPanelWidth = 366;
        const int rightPanelWidth = 374;
        const int topPanelHeight = 152;
        const int topPanelY = 178;
        const int bottomPanelHeight = 112;
        const int bottomPanelY = 42;

        var title = $"{CultureInfo.InvariantCulture.TextInfo.ToTitleCase(preview.Type)} Report";
        var summaryCards = new (string Label, string Value)[]
        {
            ("Total Revenue", $"PHP {preview.TotalRevenue:N2}"),
            ("Total Companies", preview.TotalCompanies.ToString(CultureInfo.InvariantCulture)),
            ("Total Invoices", preview.TotalInvoices.ToString(CultureInfo.InvariantCulture)),
            ("Paid", preview.Paid.ToString(CultureInfo.InvariantCulture)),
            ("Pending", preview.Pending.ToString(CultureInfo.InvariantCulture)),
            ("Failed", preview.Failed.ToString(CultureInfo.InvariantCulture)),
        };

        var monthlyRows = preview.MonthlyBreakdown.Count > 0
            ? preview.MonthlyBreakdown.Select(item => $"{item.Month}: PHP {item.Revenue:N2}").ToList()
            : new List<string> { "No monthly revenue data for the selected period." };

        var statusRows = preview.StatusDistribution.Count > 0
            ? preview.StatusDistribution.Select(item => $"{item.Status}: {item.Count}").ToList()
            : new List<string>
            {
                $"Report type: {CultureInfo.InvariantCulture.TextInfo.ToTitleCase(preview.Type)}",
                $"Paid invoices: {preview.Paid}",
                $"Pending invoices: {preview.Pending}",
                $"Failed invoices: {preview.Failed}",
            };

        var topCompanyRows = preview.TopCompanyPayments.Count > 0
            ? preview.TopCompanyPayments.Select(item => $"{item.CompanyName} - PHP {item.Amount:N2} | {item.TransactionCount} txns").ToList()
            : new List<string>
            {
                "No company-level payment entries matched the selected period.",
                "Use the Excel download when you need row-level detail.",
            };

        var content = new StringBuilder();

        AppendPdfText(content, margin, 548, 22, title);
        AppendPdfText(content, margin, 528, 11, $"Period: {preview.StartDate:yyyy-MM-dd} to {preview.EndDate:yyyy-MM-dd}");
        AppendPdfText(content, 602, 528, 10, $"Generated {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC");

        for (var index = 0; index < 3; index++)
        {
            AppendPdfMetricCard(content, margin + index * (cardWidth + cardGap), firstRowY, cardWidth, cardHeight, summaryCards[index].Label, summaryCards[index].Value);
            AppendPdfMetricCard(content, margin + index * (cardWidth + cardGap), secondRowY, cardWidth, cardHeight, summaryCards[index + 3].Label, summaryCards[index + 3].Value);
        }

        AppendPdfPanel(content, margin, topPanelY, leftPanelWidth, topPanelHeight, "Monthly Breakdown", monthlyRows, 6, 46);
        AppendPdfPanel(content, margin + leftPanelWidth + panelGap, topPanelY, rightPanelWidth, topPanelHeight, preview.StatusDistribution.Count > 0 ? "Status Distribution" : "Report Highlights", statusRows, 6, 44);
        AppendPdfPanel(content, margin, bottomPanelY, pageWidth - (margin * 2), bottomPanelHeight, preview.TopCompanyPayments.Count > 0 ? "Top Company Payments" : "Export Notes", topCompanyRows, 4, 92);

        var objects = new[]
        {
            "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
            "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
            "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
            "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
            $"5 0 obj\n<< /Length {Encoding.ASCII.GetByteCount(content.ToString())} >>\nstream\n{content}\nendstream\nendobj\n"
        };

        using var stream = new MemoryStream();
        WriteAscii(stream, "%PDF-1.4\n");

        var offsets = new List<long> { 0 };
        foreach (var obj in objects)
        {
            offsets.Add(stream.Position);
            WriteAscii(stream, obj);
        }

        var xrefPosition = stream.Position;
        WriteAscii(stream, $"xref\n0 {objects.Length + 1}\n");
        WriteAscii(stream, "0000000000 65535 f \n");
        foreach (var offset in offsets.Skip(1))
        {
            WriteAscii(stream, $"{offset:0000000000} 00000 n \n");
        }

        WriteAscii(stream, $"trailer\n<< /Size {objects.Length + 1} /Root 1 0 R >>\nstartxref\n{xrefPosition}\n%%EOF");
        return stream.ToArray();
    }

    private static void AppendPdfMetricCard(StringBuilder content, int x, int y, int width, int height, string label, string value)
    {
        AppendPdfRectangle(content, x, y, width, height, "0.968 0.980 1 rg", "0.835 0.878 0.941 RG");
        AppendPdfText(content, x + 16, y + height - 18, 9, label.ToUpperInvariant());
        AppendPdfText(content, x + 16, y + 18, 18, TruncatePdfLine(value, 24));
    }

    private static void AppendPdfPanel(StringBuilder content, int x, int y, int width, int height, string title, IReadOnlyList<string> rows, int maxRows, int maxCharacters)
    {
        AppendPdfRectangle(content, x, y, width, height, "0.995 0.997 1 rg", "0.874 0.902 0.945 RG");
        AppendPdfText(content, x + 16, y + height - 22, 13, title);

        var visibleRows = rows
            .Where(row => !string.IsNullOrWhiteSpace(row))
            .Take(maxRows)
            .Select(row => TruncatePdfLine(row, maxCharacters))
            .ToList();

        if (rows.Count > maxRows && visibleRows.Count > 0)
        {
            visibleRows[visibleRows.Count - 1] = $"+{rows.Count - maxRows + 1} more entries";
        }

        if (visibleRows.Count == 0)
        {
            visibleRows.Add("No report data available for this section.");
        }

        var textY = y + height - 46;
        foreach (var row in visibleRows)
        {
            AppendPdfText(content, x + 16, textY, 10, row);
            textY -= 16;
        }
    }

    private static void AppendPdfRectangle(StringBuilder content, int x, int y, int width, int height, string fillColor, string strokeColor)
    {
        content.AppendLine("q");
        content.AppendLine(fillColor);
        content.AppendLine(strokeColor);
        content.AppendLine($"{x} {y} {width} {height} re B");
        content.AppendLine("Q");
    }

    private static void AppendPdfText(StringBuilder content, int x, int y, int fontSize, string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return;
        }

        content.AppendLine("BT");
        content.AppendLine($"/F1 {fontSize} Tf");
        content.AppendLine($"1 0 0 1 {x} {y} Tm");
        content.AppendLine($"({EscapePdf(value)}) Tj");
        content.AppendLine("ET");
    }

    private static string TruncatePdfLine(string value, int maxLength)
    {
        var normalized = value
            .Replace("\r", " ", StringComparison.Ordinal)
            .Replace("\n", " ", StringComparison.Ordinal)
            .Trim();

        if (normalized.Length <= maxLength)
        {
            return normalized;
        }

        return $"{normalized[..Math.Max(maxLength - 3, 1)]}...";
    }

    private static void WriteAscii(Stream stream, string value)
    {
        var bytes = Encoding.ASCII.GetBytes(value);
        stream.Write(bytes, 0, bytes.Length);
    }

    private static string EscapePdf(string value)
    {
        return value
            .Replace("\\", "\\\\", StringComparison.Ordinal)
            .Replace("(", "\\(", StringComparison.Ordinal)
            .Replace(")", "\\)", StringComparison.Ordinal)
            .Replace("₱", "PHP ", StringComparison.Ordinal);
    }

    private static string BuildReportFileName(string type, DateTime startDate, DateTime endDate, string extension)
    {
        return $"{NormalizeReportType(type)}-report-{startDate:yyyy-MM-dd}-{endDate:yyyy-MM-dd}.{extension}";
    }

    private static string ResolveCompanyAdminContactRole(string? contactRole)
    {
        return string.IsNullOrWhiteSpace(contactRole) ? "Organization Admin" : contactRole.Trim();
    }

    private static string ResolveCompanyEmail(Organization organization, IReadOnlyDictionary<Guid, AppUser> primaryUsers)
    {
        if (!string.IsNullOrWhiteSpace(organization.Email))
        {
            return organization.Email;
        }

        return primaryUsers.TryGetValue(organization.Id, out var user) ? user.Email : string.Empty;
    }

    private static string ResolveContactName(Organization organization, IReadOnlyDictionary<Guid, AppUser> primaryUsers)
    {
        if (!string.IsNullOrWhiteSpace(organization.ContactPerson))
        {
            return organization.ContactPerson;
        }

        return primaryUsers.TryGetValue(organization.Id, out var user) ? BuildUserDisplayName(user) : "N/A";
    }

    private static string ResolveContactEmail(Organization organization, IReadOnlyDictionary<Guid, AppUser> primaryUsers)
    {
        return primaryUsers.TryGetValue(organization.Id, out var user)
            ? user.Email
            : ResolveCompanyEmail(organization, primaryUsers);
    }

    private static string BuildUserDisplayName(AppUser user)
    {
        var fullName = string.Join(" ", new[] { user.FirstName, user.LastName }.Where(value => !string.IsNullOrWhiteSpace(value))).Trim();
        return string.IsNullOrWhiteSpace(fullName) ? user.Email : fullName;
    }

    private static string ResolveCurrentPlan(Guid organizationId, IReadOnlyCollection<OrganizationSubscription> subscriptions, string legacyPlan)
    {
        var subscription = subscriptions.FirstOrDefault(item => item.OrganizationId == organizationId);
        return subscription is null ? NormalizePlan(legacyPlan) : NormalizePlan(subscription.Plan);
    }

    private static string ResolveCompanyStatus(Organization organization)
    {
        return string.Equals(organization.ApprovalStatus, "Approved", StringComparison.OrdinalIgnoreCase)
            ? organization.Active ? "Active" : "Inactive"
            : "Pending";
    }

    private static string? NormalizeOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static (string FirstName, string LastName) SplitContactName(string contactName)
    {
        var parts = contactName.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (parts.Length == 0)
        {
            return ("Company", "Admin");
        }

        if (parts.Length == 1)
        {
            return (parts[0], "Admin");
        }

        return (parts[0], string.Join(' ', parts.Skip(1)));
    }

    private async Task SyncSubscriptionPaymentAsync(OrganizationSubscription subscription, DateTime timestamp, CancellationToken cancellationToken)
    {
        var payment = await dbContext.PaymentTransactions.FirstOrDefaultAsync(x => x.SubscriptionId == subscription.Id, cancellationToken);
        if (payment is null)
        {
            payment = new PaymentTransaction
            {
                Id = Guid.NewGuid(),
                ReferenceNumber = BuildPaymentReference(),
                CreatedAt = timestamp,
            };

            dbContext.PaymentTransactions.Add(payment);
        }

        payment.OrganizationId = subscription.OrganizationId;
        payment.SubscriptionId = subscription.Id;
        payment.Amount = subscription.Amount;
        payment.Method = "Manual";
        payment.Status = "Paid";
        payment.Description = $"Subscription payment for {subscription.Plan} plan";
        payment.BillingPeriodStart = subscription.StartDate;
        payment.BillingPeriodEnd = subscription.EndDate;
        payment.GatewayMessage = "Recorded by superadmin subscription management";
        payment.PaidAt = timestamp;
        payment.UpdatedAt = timestamp;
    }


    private static DateTime ResolveSubscriptionEndDate(DateTime startDate, string billingCycle)
    {
        return NormalizeBillingCycle(billingCycle) == "Yearly"
            ? startDate.AddYears(1)
            : startDate.AddMonths(1);
    }

    private static decimal ResolveSubscriptionAmount(string plan, string billingCycle)
    {
        var monthlyAmount = NormalizePlan(plan) switch
        {
            "Professional" => 2499m,
            "Enterprise" => 4999m,
            _ => 999m,
        };

        return NormalizeBillingCycle(billingCycle) == "Yearly"
            ? monthlyAmount * 12m
            : monthlyAmount;
    }

    private static decimal NormalizeMonthlyAmount(OrganizationSubscription subscription)
    {
        return NormalizeBillingCycle(subscription.BillingCycle) == "Yearly"
            ? Math.Round(subscription.Amount / 12m, 2)
            : subscription.Amount;
    }

    private static DateTime PaymentDate(PaymentTransaction payment)
    {
        return payment.PaidAt ?? payment.CreatedAt;
    }

    private static DateTime StartOfMonth(DateTime value)
    {
        return new DateTime(value.Year, value.Month, 1, 0, 0, 0, DateTimeKind.Utc);
    }

    private static DateTime EndOfMonth(DateTime value)
    {
        return StartOfMonth(value).AddMonths(1).AddTicks(-1);
    }

    private static string BuildPaymentReference()
    {
        return $"SUP-{DateTime.UtcNow:yyyyMMddHHmmss}-{Guid.NewGuid().ToString("N")[..8].ToUpperInvariant()}";
    }

    private static int NormalizePage(int page)
    {
        return page <= 0 ? 1 : page;
    }

    private static int NormalizePageSize(int pageSize, int defaultSize, int maxSize)
    {
        if (pageSize <= 0)
        {
            return defaultSize;
        }

        return Math.Min(pageSize, maxSize);
    }

    private static string NormalizeReportType(string type)
    {
        return type.Trim().ToLowerInvariant() switch
        {
            "revenue" => "revenue",
            "payment" or "payments" => "payments",
            _ => throw new InvalidOperationException("Unsupported report type")
        };
    }

    private static string NormalizePlan(string? plan)
    {
        return plan?.Trim().ToLowerInvariant() switch
        {
            "starter" or "free" => "Starter",
            "professional" or "pro" => "Professional",
            "enterprise" => "Enterprise",
            _ => "Starter"
        };
    }

    private static string NormalizeSubscriptionStatus(string? status)
    {
        return status?.Trim().ToLowerInvariant() switch
        {
            "active" => "Active",
            "trial" => "Trial",
            "expired" => "Expired",
            "cancelled" or "canceled" => "Cancelled",
            "inactive" => "Inactive",
            _ => "Active"
        };
    }

    private static string NormalizeBillingCycle(string? billingCycle)
    {
        return billingCycle?.Trim().ToLowerInvariant() switch
        {
            "yearly" or "annual" => "Yearly",
            _ => "Monthly"
        };
    }

    private static string NormalizePaymentStatus(string? status)
    {
        return status?.Trim().ToLowerInvariant() switch
        {
            "paid" => "Paid",
            "pending" => "Pending",
            "failed" => "Failed",
            "refunded" => "Refunded",
            _ => "Pending"
        };
    }

    private static string NormalizePaymentMethod(string? method)
    {
        return method?.Trim().ToLowerInvariant() switch
        {
            "card" => "Card",
            "bank" or "bank transfer" => "Bank Transfer",
            "gcash" => "GCash",
            "grabpay" => "GrabPay",
            "maya" => "Maya",
            "paymongo" => "PayMongo",
            _ => "Manual"
        };
    }

    private static bool IsOneOf(string? value, params string[] expected)
    {
        return expected.Any(item => item.Equals(value?.Trim(), StringComparison.OrdinalIgnoreCase));
    }
}