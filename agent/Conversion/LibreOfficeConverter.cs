using System.Diagnostics;
using CyberPrintPay.Agent.Configuration;

namespace CyberPrintPay.Agent.Conversion;

/// <summary>Runs LibreOffice headlessly with a bounded execution time and isolated temporary profile.</summary>
public sealed class LibreOfficeConverter(IOptions<AgentOptions> options, ILogger<LibreOfficeConverter> logger) : IDocumentConverter
{
    public async Task<ConversionResult> ConvertToPdfAsync(string inputPath, string outputDirectory, CancellationToken cancellationToken)
    {
        if (!File.Exists(inputPath)) return new(false, null, "Input file does not exist.");
        if (Path.GetExtension(inputPath).Equals(".pdf", StringComparison.OrdinalIgnoreCase)) return new(true, inputPath, null);
        if (!File.Exists(options.Value.LibreOfficePath)) return new(false, null, "LibreOffice executable is not installed at the configured path.");

        Directory.CreateDirectory(outputDirectory);
        var profileDirectory = Path.Combine(outputDirectory, ".lo-profile-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(profileDirectory);
        try
        {
            var startInfo = new ProcessStartInfo
            {
                FileName = options.Value.LibreOfficePath,
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardError = true,
                RedirectStandardOutput = true
            };
            startInfo.ArgumentList.Add("--headless");
            startInfo.ArgumentList.Add("--nologo");
            startInfo.ArgumentList.Add("--nodefault");
            startInfo.ArgumentList.Add("--nolockcheck");
            startInfo.ArgumentList.Add($"-env:UserInstallation={new Uri(profileDirectory).AbsoluteUri}");
            startInfo.ArgumentList.Add("--convert-to");
            startInfo.ArgumentList.Add("pdf");
            startInfo.ArgumentList.Add("--outdir");
            startInfo.ArgumentList.Add(outputDirectory);
            startInfo.ArgumentList.Add(inputPath);

            using var process = Process.Start(startInfo) ?? throw new InvalidOperationException("LibreOffice did not start.");
            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeout.CancelAfter(TimeSpan.FromSeconds(options.Value.ConversionTimeoutSeconds));
            try
            {
                await process.WaitForExitAsync(timeout.Token);
            }
            catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
            {
                if (!process.HasExited) process.Kill(entireProcessTree: true);
                return new(false, null, "LibreOffice conversion timed out.");
            }

            var output = await process.StandardOutput.ReadToEndAsync(cancellationToken);
            var error = await process.StandardError.ReadToEndAsync(cancellationToken);
            var pdfPath = Path.Combine(outputDirectory, Path.GetFileNameWithoutExtension(inputPath) + ".pdf");
            if (process.ExitCode != 0 || !File.Exists(pdfPath))
            {
                logger.LogWarning("LibreOffice conversion failed with exit code {ExitCode}: {Error}", process.ExitCode, error);
                return new(false, null, $"LibreOffice conversion failed. {output} {error}".Trim());
            }
            return new(true, pdfPath, null);
        }
        finally
        {
            if (Directory.Exists(profileDirectory)) Directory.Delete(profileDirectory, recursive: true);
        }
    }
}
