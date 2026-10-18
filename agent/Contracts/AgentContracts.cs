namespace CyberPrintPay.Agent.Contracts;

public sealed record HeartbeatRequest(string AgentId, string ShopId, string Version, string PrinterName, bool PrintingEnabled);
public sealed record ClaimNextRequest(string AgentId, string ShopId);
public sealed record ClaimedJob(string JobId, string ClaimId, string DispatchId, string FileName, string MimeType, string Sha256, int PageCount, string? DownloadPath);
public sealed record DownloadGrant(string Url);
public sealed record DispatchReport(string AgentId, string JobId, string ClaimId, string DispatchId, string Status, string? Detail = null, string? SpoolerJobId = null);

public sealed record DispatchJournalEntry(
    string JobId,
    string ClaimId,
    string DispatchId,
    string State,
    DateTimeOffset UpdatedAt,
    string? Detail = null,
    string? LocalFilePath = null);
