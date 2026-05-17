using InnoTrack.RDMS.Api.Application.Dtos.SuperAdmin;

namespace InnoTrack.RDMS.Api.Application.Interfaces.Services;

public interface ISuperAdminPortalService
{
    Task<DashboardStatsDto> GetDashboardAsync(CancellationToken cancellationToken = default);
    Task<PagedResponseDto<CompanyListItemDto>> GetCompaniesAsync(CompanyQueryDto query, CancellationToken cancellationToken = default);
    Task<CompanyDetailDto?> GetCompanyByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<CompanyDetailDto> CreateCompanyAsync(CreateCompanyDto request, Guid actorUserId, string? ipAddress, CancellationToken cancellationToken = default);
    Task<CompanyDetailDto?> UpdateCompanyAsync(Guid id, UpdateCompanyDto request, Guid actorUserId, string? ipAddress, CancellationToken cancellationToken = default);
    Task<bool> DeleteCompanyAsync(Guid id, Guid actorUserId, string? ipAddress, CancellationToken cancellationToken = default);
    Task<bool> ApproveCompanyAsync(Guid id, Guid actorUserId, string? ipAddress, CancellationToken cancellationToken = default);
    Task<bool> SetCompanyActiveStateAsync(Guid id, bool isActive, Guid actorUserId, string? ipAddress, CancellationToken cancellationToken = default);
    Task<PagedResponseDto<SubscriptionItemDto>> GetSubscriptionsAsync(SubscriptionQueryDto query, CancellationToken cancellationToken = default);
    Task<SubscriptionSummaryDto> GetSubscriptionSummaryAsync(CancellationToken cancellationToken = default);
    Task<SubscriptionItemDto?> UpdateSubscriptionAsync(Guid id, UpdateSubscriptionDto request, Guid actorUserId, string? ipAddress, CancellationToken cancellationToken = default);
    Task<PagedResponseDto<PaymentItemDto>> GetPaymentsAsync(PaymentQueryDto query, CancellationToken cancellationToken = default);
    Task<PaymentSummaryDto> GetPaymentSummaryAsync(CancellationToken cancellationToken = default);
    Task<ReportPreviewDto> GetReportPreviewAsync(ReportPreviewQueryDto query, CancellationToken cancellationToken = default);
    Task<GeneratedFileDto> DownloadReportAsync(string type, ReportDownloadQueryDto query, CancellationToken cancellationToken = default);
}