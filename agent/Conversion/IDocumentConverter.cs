namespace CyberPrintPay.Agent.Conversion;

public sealed record ConversionResult(bool Succeeded, string? PdfPath, string? Error);

public interface IDocumentConverter
{
    Task<ConversionResult> ConvertToPdfAsync(string inputPath, string outputDirectory, CancellationToken cancellationToken);
}
