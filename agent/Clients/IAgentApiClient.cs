using CyberPrintPay.Agent.Contracts;

namespace CyberPrintPay.Agent.Clients;

public interface IAgentApiClient
{
    Task SendHeartbeatAsync(HeartbeatRequest request, CancellationToken cancellationToken);
    Task<ClaimedJob?> ClaimNextApprovedJobAsync(ClaimNextRequest request, CancellationToken cancellationToken);
    Task<DownloadGrant> GetDownloadGrantAsync(string jobId, string claimId, CancellationToken cancellationToken);
    Task ReportAsync(DispatchReport report, CancellationToken cancellationToken);
    Task DownloadFileAsync(DownloadGrant grant, string destinationPath, long maxBytes, CancellationToken cancellationToken);
}
