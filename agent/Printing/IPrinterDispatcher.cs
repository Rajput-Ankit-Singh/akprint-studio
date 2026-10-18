namespace CyberPrintPay.Agent.Printing;

public sealed record PrintRequest(string DispatchId, string PdfPath, string PrinterName, int ExpectedPageCount);
public sealed record PrintDispatchResult(bool Accepted, string? SpoolerJobId, string? FailureReason);

public interface IPrinterDispatcher
{
    Task<PrintDispatchResult> DispatchAsync(PrintRequest request, CancellationToken cancellationToken);
}
