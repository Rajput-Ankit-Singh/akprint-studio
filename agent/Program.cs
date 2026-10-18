using CyberPrintPay.Agent;
using CyberPrintPay.Agent.Clients;
using CyberPrintPay.Agent.Configuration;
using CyberPrintPay.Agent.Conversion;
using CyberPrintPay.Agent.Journal;
using CyberPrintPay.Agent.Printing;

var builder = Host.CreateApplicationBuilder(args);
builder.Services.AddWindowsService(options => options.ServiceName = "CyberPrintPayAgent");

builder.Services.AddOptions<AgentOptions>()
    .Bind(builder.Configuration.GetSection(AgentOptions.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();

builder.Services.AddHttpClient<IAgentApiClient, AgentApiClient>((services, client) =>
{
    var options = services.GetRequiredService<IOptions<AgentOptions>>().Value;
    client.BaseAddress = new Uri(options.ApiBaseUrl, UriKind.Absolute);
    client.Timeout = TimeSpan.FromSeconds(options.HttpTimeoutSeconds);
});
builder.Services.AddSingleton<IEncryptedDispatchJournal, DpapiDispatchJournal>();
builder.Services.AddSingleton<IDocumentConverter, LibreOfficeConverter>();
// This deliberately rejects every print submission until a verified spooler implementation is installed.
builder.Services.AddSingleton<IPrinterDispatcher, FailClosedPrinterDispatcher>();
builder.Services.AddHostedService<PrintAgentWorker>();

await builder.Build().RunAsync();
