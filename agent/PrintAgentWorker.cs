using System.Security.Cryptography;
using CyberPrintPay.Agent.Clients;
using CyberPrintPay.Agent.Configuration;
using CyberPrintPay.Agent.Contracts;
using CyberPrintPay.Agent.Conversion;
using CyberPrintPay.Agent.Journal;
using CyberPrintPay.Agent.Printing;

namespace CyberPrintPay.Agent;

public sealed class PrintAgentWorker(
    IAgentApiClient api,
    IEncryptedDispatchJournal journal,
    IDocumentConverter converter,
    IPrinterDispatcher printer,
    IOptions<AgentOptions> options,
    ILogger<PrintAgentWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await RecoverInterruptedDispatchesAsync(stoppingToken);
        var nextHeartbeatAt = DateTimeOffset.MinValue;
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                if (DateTimeOffset.UtcNow >= nextHeartbeatAt)
                {
                    await SendHeartbeatAsync(stoppingToken);
                    nextHeartbeatAt = DateTimeOffset.UtcNow.AddSeconds(options.Value.HeartbeatSeconds);
                }
                await ProcessOneClaimAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { }
            catch (Exception ex) { logger.LogError(ex, "Agent loop iteration failed."); }
            await Task.Delay(TimeSpan.FromSeconds(options.Value.ClaimPollSeconds), stoppingToken);
        }
    }

    private async Task SendHeartbeatAsync(CancellationToken cancellationToken)
    {
        var assemblyVersion = typeof(PrintAgentWorker).Assembly.GetName().Version?.ToString() ?? "unknown";
        await api.SendHeartbeatAsync(new(options.Value.AgentId, options.Value.ShopId, assemblyVersion, options.Value.AllowedPrinterName, PrintingEnabled: false), cancellationToken);
    }

    private async Task RecoverInterruptedDispatchesAsync(CancellationToken cancellationToken)
    {
        foreach (var entry in await journal.ReadAllAsync(cancellationToken))
        {
            logger.LogWarning("Recovering interrupted dispatch {DispatchId} as failed_review. It will not be retried automatically.", entry.DispatchId);
            await api.ReportAsync(new(options.Value.AgentId, entry.JobId, entry.ClaimId, entry.DispatchId, "failed_review", "Agent restart or interruption. Operator review required."), cancellationToken);
            DeleteIfExists(entry.LocalFilePath);
            await journal.RemoveAsync(entry.DispatchId, cancellationToken);
        }
    }

    private async Task ProcessOneClaimAsync(CancellationToken cancellationToken)
    {
        var job = await api.ClaimNextApprovedJobAsync(new(options.Value.AgentId, options.Value.ShopId), cancellationToken);
        if (job is null) return;

        var workDirectory = Path.Combine(options.Value.WorkingDirectory, job.DispatchId);
        var sourcePath = Path.Combine(workDirectory, SafeFileName(job.FileName));
        await journal.SaveAsync(new(job.JobId, job.ClaimId, job.DispatchId, "claimed", DateTimeOffset.UtcNow, LocalFilePath: sourcePath), cancellationToken);
        try
        {
            var grant = await api.GetDownloadGrantAsync(job.JobId, job.ClaimId, cancellationToken);
            await api.DownloadFileAsync(grant, sourcePath, options.Value.MaxDownloadMegabytes * 1024L * 1024L, cancellationToken);
            await VerifySha256Async(sourcePath, job.Sha256, cancellationToken);
            await journal.SaveAsync(new(job.JobId, job.ClaimId, job.DispatchId, "converting", DateTimeOffset.UtcNow, LocalFilePath: sourcePath), cancellationToken);

            var conversion = await converter.ConvertToPdfAsync(sourcePath, workDirectory, cancellationToken);
            if (!conversion.Succeeded || conversion.PdfPath is null) throw new InvalidOperationException(conversion.Error ?? "Conversion failed.");
            await api.ReportAsync(new(options.Value.AgentId, job.JobId, job.ClaimId, job.DispatchId, "conversion_succeeded"), cancellationToken);
            var dispatched = await printer.DispatchAsync(new(job.DispatchId, conversion.PdfPath, options.Value.AllowedPrinterName, job.PageCount), cancellationToken);
            if (!dispatched.Accepted) throw new InvalidOperationException(dispatched.FailureReason ?? "Spooler rejected dispatch.");
            await api.ReportAsync(new(options.Value.AgentId, job.JobId, job.ClaimId, job.DispatchId, "dispatch_started", SpoolerJobId: dispatched.SpoolerJobId), cancellationToken);
        }
        catch (Exception ex) when (!cancellationToken.IsCancellationRequested)
        {
            logger.LogError(ex, "Dispatch {DispatchId} failed closed.", job.DispatchId);
            await api.ReportAsync(new(options.Value.AgentId, job.JobId, job.ClaimId, job.DispatchId, "failed_review", ex.Message), cancellationToken);
        }
        finally
        {
            DeleteIfExists(sourcePath);
            if (Directory.Exists(workDirectory)) Directory.Delete(workDirectory, recursive: true);
            await journal.RemoveAsync(job.DispatchId, CancellationToken.None);
        }
    }

    private static async Task VerifySha256Async(string path, string expectedHex, CancellationToken cancellationToken)
    {
        await using var stream = File.OpenRead(path);
        var actual = Convert.ToHexString(await SHA256.HashDataAsync(stream, cancellationToken));
        if (!actual.Equals(expectedHex, StringComparison.OrdinalIgnoreCase)) throw new CryptographicException("Downloaded file hash does not match the server claim.");
    }

    private static string SafeFileName(string value) => Path.GetFileName(value);
    private static void DeleteIfExists(string? path) { if (!string.IsNullOrWhiteSpace(path) && File.Exists(path)) File.Delete(path); }
}
