# CyberPrint Pay Windows Agent

This is an isolated .NET 8 Windows Worker Service scaffold for the on-site CyberPrint Pay print agent. It only uses outbound HTTPS and is designed to fail closed: **the supplied printer dispatcher never submits a physical print**. A verified Windows spooler implementation, capability checks, and terminal spooler monitoring are still required before a real printer can be enabled.

## What is included

- Options-based configuration in `appsettings.json`.
- Outbound client abstractions for `heartbeat`, `claim-next-approved-job`, claimed-job download, conversion reporting, and dispatch reporting.
- Per-dispatch encrypted local recovery journal using Windows DPAPI `LocalMachine` protection.
- SHA-256 verification for downloaded files and bounded download size.
- LibreOffice headless conversion wrapper with an isolated profile and timeout.
- Printer abstraction with a deliberately fail-closed default implementation.
- Restart recovery that reports any durable, unfinished dispatch as `failed_review`, never as an automatic retry.

## Prerequisites

1. Windows with the .NET 8 SDK or .NET 8 Windows Desktop Runtime installed.
2. LibreOffice installed if office-document conversion will be enabled.
3. A restricted Windows service identity with access only to the selected printer, `C:\ProgramData\CyberPrintPay`, and the configured LibreOffice executable.
4. An enrolled backend agent identity. Do **not** put a Firebase service-account JSON key or other long-lived key in this repository or in `appsettings.json`.

## Configure

1. Copy `appsettings.Development.json.example` to `appsettings.Development.json` for local development, or supply production values through service environment variables.
2. Set all placeholder values in the `CyberPrintAgent` configuration section, especially `ApiBaseUrl`, `AgentId`, `ShopId`, and `AllowedPrinterName`.
3. Supply the enrollment credential only as an environment variable. The default variable name is `CYBERPRINT_AGENT_ENROLLMENT_TOKEN`:

   ```powershell
   [Environment]::SetEnvironmentVariable('CYBERPRINT_AGENT_ENROLLMENT_TOKEN', '<short-lived-enrollment-or-rotated-agent-token>', 'Machine')
   ```

4. Restart the process or Windows service after changing machine environment variables.

The backend is expected to authenticate the `Authorization: Bearer` token and validate the `X-CyberPrint-Agent-Id` and `X-CyberPrint-Shop-Id` headers. The endpoint path names in `AgentApiClient` are placeholders that must match the backend implementation.

## Run locally

From this `agent` directory:

```powershell
dotnet restore
dotnet run --environment Development
```

No print will be made, even if the agent receives a claimed job. The default `FailClosedPrinterDispatcher` reports the outcome as `failed_review`.

## Publish and install as a Windows service

Publish for the appropriate architecture, then install with an administrator shell:

```powershell
dotnet publish -c Release -r win-x64 --self-contained false -o .\publish
sc.exe create CyberPrintPayAgent binPath= "C:\path\to\publish\CyberPrintPay.Agent.exe" start= auto
sc.exe start CyberPrintPayAgent
```

Run the service under a non-administrator identity before enabling any real print implementation. Configure Windows recovery actions and inspect the Windows Application event log for worker failures.

## Testing notes

Run the scoped build check:

```powershell
dotnet build .\CyberPrintPay.Agent.csproj -c Release
```

Before replacing the fail-closed printer adapter, add tests for:

1. DPAPI journal write/read and restart recovery.
2. Maximum-size and SHA-256 download rejection.
3. LibreOffice timeout, missing executable, and known conversion fixtures.
4. Printer allowlist and driver-capability validation.
5. Spooler offline, jam, cancellation, agent restart, and missing terminal status, all of which must report `failed_review`.
6. Duplicate claim or dispatch-report requests, which the backend must make idempotent.

## Security and operational boundaries

- No inbound listener or direct Firestore polling is included.
- The agent expects short-lived, enrolled-agent credentials. It intentionally contains no service-account key support.
- Journal contents are encrypted at rest with DPAPI, but journal directory ACLs must still limit access to the service identity and administrators.
- Only integrate a real printer adapter after it validates printer name and capabilities, uses the backend dispatch ID in the spooler title, observes a terminal spooler result, and never retries an uncertain physical outcome automatically.
