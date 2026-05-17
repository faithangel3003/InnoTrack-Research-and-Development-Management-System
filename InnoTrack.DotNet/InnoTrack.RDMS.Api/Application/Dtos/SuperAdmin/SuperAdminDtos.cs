using System.ComponentModel.DataAnnotations;
using InnoTrack.RDMS.Api.Security.Password;
using InnoTrack.RDMS.Api.Security.Validation;

namespace InnoTrack.RDMS.Api.Application.Dtos.SuperAdmin;

public class PagedResponseDto<T>
{
    public List<T> Items { get; set; } = [];
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int Total { get; set; }
}

public class DashboardStatsDto
{
    public int TotalCompanies { get; set; }
    public int ActiveCompanies { get; set; }
    public int NewCompaniesThisMonth { get; set; }
    public int TotalSubscriptions { get; set; }
    public int ActiveSubscriptions { get; set; }
    public int TrialSubscriptions { get; set; }
    public int TotalUsers { get; set; }
    public decimal TotalRevenue { get; set; }
    public decimal MonthlyRevenue { get; set; }
    public decimal RevenueGrowthPercent { get; set; }
    public decimal AvgRevenuePerMonth { get; set; }
    public List<RevenuePointDto> RevenueByMonth { get; set; } = [];
    public List<SubscriptionDistributionDto> SubscriptionDistribution { get; set; } = [];
    public List<RecentCompanyDto> RecentCompanies { get; set; } = [];
    public List<RecentPaymentDto> RecentPayments { get; set; } = [];
}

public class RevenuePointDto
{
    public string Month { get; set; } = string.Empty;
    public decimal Revenue { get; set; }
}

public class SubscriptionDistributionDto
{
    public string Plan { get; set; } = string.Empty;
    public int Count { get; set; }
    public decimal Percentage { get; set; }
}

public class RecentCompanyDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Plan { get; set; } = string.Empty;
    public DateTime RegisteredAt { get; set; }
}

public class RecentPaymentDto
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime Date { get; set; }
}

public class CompanyQueryDto
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
    public string? Search { get; set; }
    public string? Status { get; set; }
}

public class CompanyListItemDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string ContactName { get; set; } = string.Empty;
    public string ContactEmail { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Plan { get; set; } = string.Empty;
    public string SubscriptionStatus { get; set; } = string.Empty;
    public DateTime RegisteredAt { get; set; }
}

public class CompanyDetailDto : CompanyListItemDto
{
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? ContactRole { get; set; }
    public string? Industry { get; set; }
    public DateTime? LastActiveAt { get; set; }
    public SubscriptionItemDto? Subscription { get; set; }
    public List<PaymentItemDto> Payments { get; set; } = [];
}

public class CreateCompanyDto
{
    [Required]
    [StringLength(InputLimitsConstants.Name, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [MaxLength(InputLimitsConstants.Email)]
    public string Email { get; set; } = string.Empty;

    [MaxLength(InputLimitsConstants.PasswordMax)]
    [PasswordPolicy]
    public string? Password { get; set; }

    [StringLength(InputLimitsConstants.Phone)]
    public string? Phone { get; set; }

    [StringLength(InputLimitsConstants.ShortDescription)]
    public string? Address { get; set; }

    [Required]
    [StringLength(InputLimitsConstants.Name, MinimumLength = 2)]
    public string ContactName { get; set; } = string.Empty;

    [StringLength(120)]
    public string? ContactRole { get; set; }

    [StringLength(120)]
    public string? Industry { get; set; }

    [Required]
    public string Plan { get; set; } = "Professional";

    [Required]
    public string SubscriptionStatus { get; set; } = "Active";

    [Required]
    public string BillingCycle { get; set; } = "Monthly";

    [Range(0, double.MaxValue)]
    public decimal Amount { get; set; }

    public bool IsActive { get; set; } = true;
}

public class UpdateCompanyDto : CreateCompanyDto
{
}

public class SubscriptionQueryDto
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
    public string? Search { get; set; }
    public string? Status { get; set; }
    public string? Plan { get; set; }
    public Guid? CompanyId { get; set; }
}

public class SubscriptionSummaryDto
{
    public int Total { get; set; }
    public int Active { get; set; }
    public int Trial { get; set; }
    public int Expired { get; set; }
    public int Cancelled { get; set; }
}

public class SubscriptionItemDto
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string CompanyEmail { get; set; } = string.Empty;
    public string Plan { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string BillingCycle { get; set; } = string.Empty;
    public decimal Amount { get; set; }
}

public class UpdateSubscriptionDto
{
    [Required]
    public string Plan { get; set; } = string.Empty;

    [Required]
    public string Status { get; set; } = string.Empty;

    [Required]
    public DateTime StartDate { get; set; }

    [Required]
    public DateTime EndDate { get; set; }

    [Required]
    public string BillingCycle { get; set; } = string.Empty;

    [Range(0, double.MaxValue)]
    public decimal Amount { get; set; }
}

public class PaymentQueryDto
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string? Search { get; set; }
    public string? Status { get; set; }
    public string? Method { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
}

public class PaymentSummaryDto
{
    public int Total { get; set; }
    public decimal TotalRevenue { get; set; }
    public int Pending { get; set; }
    public int Failed { get; set; }
}

public class PaymentItemDto
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string CompanyEmail { get; set; } = string.Empty;
    public string ReferenceNumber { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Method { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public string? Description { get; set; }
    public DateTime? BillingPeriodStart { get; set; }
    public DateTime? BillingPeriodEnd { get; set; }
    public string? GatewayMessage { get; set; }
}

public class ReportPreviewQueryDto
{
    [Required]
    public string Type { get; set; } = "revenue";

    [Required]
    public DateTime StartDate { get; set; }

    [Required]
    public DateTime EndDate { get; set; }

    public string? Status { get; set; }
}

public class ReportDownloadQueryDto : ReportPreviewQueryDto
{
    [Required]
    public string Format { get; set; } = "pdf";
}

public class ReportPreviewDto
{
    public string Type { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public decimal TotalRevenue { get; set; }
    public int TotalCompanies { get; set; }
    public int TotalInvoices { get; set; }
    public int Paid { get; set; }
    public int Pending { get; set; }
    public int Failed { get; set; }
    public List<RevenuePointDto> MonthlyBreakdown { get; set; } = [];
    public List<StatusCountDto> StatusDistribution { get; set; } = [];
    public List<TopCompanyPaymentDto> TopCompanyPayments { get; set; } = [];
}

public class StatusCountDto
{
    public string Status { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class TopCompanyPaymentDto
{
    public string CompanyName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public int TransactionCount { get; set; }
}

public class GeneratedFileDto
{
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public byte[] Content { get; set; } = [];
}