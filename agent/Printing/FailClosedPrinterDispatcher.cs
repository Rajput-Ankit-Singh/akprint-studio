namespace CyberPrintPay.Agent.Printing;

/// <summary>
/// Safe default: this scaffold cannot create a physical print. Replace only after implementing
/// printer allowlist, capability validation, unique spooler title, and terminal spooler monitoring.
/// </summary>
public sealed class FailClosedPrinterDispatcher(ILogger<FailClosedPrinterDispatcher> logger) : IPrinterDispatcher
{
    public Task<PrintDispatchResult> DispatchAsync(PrintRequest request, CancellationToken cancellationToken)
    {
        logger.LogCritical("Blocked print dispatch {DispatchId}. No verified Windows spooler implementation is configured.", request.DispatchId);
        return Task.FromResult(new PrintDispatchResult(false, null, "Printing is deliberately disabled until a verified spooler implementation is configured."));
    }
}
