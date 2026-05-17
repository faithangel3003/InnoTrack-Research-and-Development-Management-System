using InnoTrack.RDMS.Api.Application.Dtos.Security;

namespace InnoTrack.RDMS.Api.Security.Masking;

public interface IUnmaskService
{
    Task<UnmaskTokenResponseDto> RequestUnmaskAsync(Guid requestedByUserId, RequestUnmaskDto request, string? ipAddress, string? userAgent, CancellationToken cancellationToken = default);
    Task<UnmaskValueResponseDto> VerifyAndUnmaskAsync(Guid requestedByUserId, VerifyUnmaskDto request, string? ipAddress, string? userAgent, CancellationToken cancellationToken = default);
    Task<List<UnmaskLogDto>> GetUnmaskLogsAsync(CancellationToken cancellationToken = default);
}