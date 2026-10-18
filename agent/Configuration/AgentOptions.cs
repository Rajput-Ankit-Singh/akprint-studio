using System.ComponentModel.DataAnnotations;

namespace CyberPrintPay.Agent.Configuration;

public sealed class AgentOptions
{
    public const string SectionName = "CyberPrintAgent";

    [Required, Url]
    public string ApiBaseUrl { get; init; } = "https://replace-with-your-backend.example/";

    [Required]
    public string AgentId { get; init; } = "replace-with-enrolled-agent-id";

    [Required]
    public string ShopId { get; init; } = "replace-with-shop-id";

    [Required]
    public string EnrollmentTokenEnvironmentVariable { get; init; } = "CYBERPRINT_AGENT_ENROLLMENT_TOKEN";

    [Required]
    public string JournalDirectory { get; init; } = @"C:\ProgramData\CyberPrintPay\journal";

    [Required]
    public string WorkingDirectory { get; init; } = @"C:\ProgramData\CyberPrintPay\work";

    [Required]
    public string LibreOfficePath { get; init; } = @"C:\Program Files\LibreOffice\program\soffice.exe";

    [Required]
    public string AllowedPrinterName { get; init; } = "replace-with-installed-printer-name";

    [Range(15, 300)]
    public int HeartbeatSeconds { get; init; } = 45;

    [Range(5, 120)]
    public int ClaimPollSeconds { get; init; } = 15;

    [Range(5, 300)]
    public int HttpTimeoutSeconds { get; init; } = 30;

    [Range(5, 600)]
    public int ConversionTimeoutSeconds { get; init; } = 120;

    [Range(1, 1024)]
    public int MaxDownloadMegabytes { get; init; } = 100;
}
