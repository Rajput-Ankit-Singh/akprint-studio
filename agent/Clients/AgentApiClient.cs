using System.Net.Http.Json;
using CyberPrintPay.Agent.Configuration;
using CyberPrintPay.Agent.Contracts;

namespace CyberPrintPay.Agent.Clients;

public sealed class AgentApiClient(HttpClient httpClient, IOptions<AgentOptions> options) : IAgentApiClient
{
    public async Task SendHeartbeatAsync(HeartbeatRequest request, CancellationToken cancellationToken) =>
        await PostAsync("agent/heartbeat", request, cancellationToken);

    public async Task<ClaimedJob?> ClaimNextApprovedJobAsync(ClaimNextRequest request, CancellationToken cancellationToken)
    {
        using var response = await SendAsync(HttpMethod.Post, "agent/claim-next-approved-job", request, cancellationToken);
        if (response.StatusCode == System.Net.HttpStatusCode.NoContent)
        {
            return null;
        }

        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<ClaimedJob>(cancellationToken: cancellationToken)
            ?? throw new InvalidOperationException("Claim endpoint returned an empty response.");
    }

    public async Task<DownloadGrant> GetDownloadGrantAsync(string jobId, string claimId, CancellationToken cancellationToken)
    {
        using var response = await SendAsync(HttpMethod.Get, $"agent/jobs/{Uri.EscapeDataString(jobId)}/claims/{Uri.EscapeDataString(claimId)}/download", null, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<DownloadGrant>(cancellationToken: cancellationToken)
            ?? throw new InvalidOperationException("Download-grant endpoint returned an empty response.");
    }

    public async Task ReportAsync(DispatchReport report, CancellationToken cancellationToken) =>
        await PostAsync("agent/report-dispatch", report, cancellationToken);

    public async Task DownloadFileAsync(DownloadGrant grant, string destinationPath, long maxBytes, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, grant.Url);
        using var response = await httpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        response.EnsureSuccessStatusCode();
        if (response.Content.Headers.ContentLength is long length && length > maxBytes)
        {
            throw new InvalidOperationException("Backend download exceeds configured byte limit.");
        }

        Directory.CreateDirectory(Path.GetDirectoryName(destinationPath)!);
        await using var source = await response.Content.ReadAsStreamAsync(cancellationToken);
        await using var destination = File.Create(destinationPath);
        var buffer = new byte[81920];
        long written = 0;
        int read;
        while ((read = await source.ReadAsync(buffer, cancellationToken)) > 0)
        {
            written += read;
            if (written > maxBytes) throw new InvalidOperationException("Backend download exceeded configured byte limit.");
            await destination.WriteAsync(buffer.AsMemory(0, read), cancellationToken);
        }
    }

    private async Task PostAsync<T>(string path, T body, CancellationToken cancellationToken)
    {
        using var response = await SendAsync(HttpMethod.Post, path, body, cancellationToken);
        response.EnsureSuccessStatusCode();
    }

    private Task<HttpResponseMessage> SendAsync(HttpMethod method, string path, object? body, CancellationToken cancellationToken)
    {
        var request = new HttpRequestMessage(method, path);
        request.Headers.Add("X-CyberPrint-Agent-Id", options.Value.AgentId);
        request.Headers.Add("X-CyberPrint-Shop-Id", options.Value.ShopId);
        var token = Environment.GetEnvironmentVariable(options.Value.EnrollmentTokenEnvironmentVariable)
            ?? throw new InvalidOperationException($"Required token environment variable '{options.Value.EnrollmentTokenEnvironmentVariable}' is not set.");
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        if (body is not null) request.Content = JsonContent.Create(body);
        return httpClient.SendAsync(request, cancellationToken);
    }
}
