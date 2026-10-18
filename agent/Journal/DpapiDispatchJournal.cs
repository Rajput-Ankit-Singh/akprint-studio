using System.Security.Cryptography;
using System.Text.Json;
using CyberPrintPay.Agent.Configuration;
using CyberPrintPay.Agent.Contracts;

namespace CyberPrintPay.Agent.Journal;

/// <summary>Persists one encrypted journal entry per dispatch using Windows DPAPI LocalMachine scope.</summary>
public sealed class DpapiDispatchJournal(IOptions<AgentOptions> options) : IEncryptedDispatchJournal
{
    private static readonly byte[] Entropy = "CyberPrintPay.DispatchJournal.v1"u8.ToArray();
    private readonly string _directory = options.Value.JournalDirectory;

    public async Task SaveAsync(DispatchJournalEntry entry, CancellationToken cancellationToken)
    {
        Directory.CreateDirectory(_directory);
        var clearText = JsonSerializer.SerializeToUtf8Bytes(entry);
        var protectedBytes = ProtectedData.Protect(clearText, Entropy, DataProtectionScope.LocalMachine);
        var path = GetPath(entry.DispatchId);
        var temporary = path + ".tmp";
        await File.WriteAllBytesAsync(temporary, protectedBytes, cancellationToken);
        File.Move(temporary, path, true);
    }

    public async Task<IReadOnlyCollection<DispatchJournalEntry>> ReadAllAsync(CancellationToken cancellationToken)
    {
        if (!Directory.Exists(_directory)) return Array.Empty<DispatchJournalEntry>();
        var entries = new List<DispatchJournalEntry>();
        foreach (var path in Directory.EnumerateFiles(_directory, "*.dispatch"))
        {
            var protectedBytes = await File.ReadAllBytesAsync(path, cancellationToken);
            var clearText = ProtectedData.Unprotect(protectedBytes, Entropy, DataProtectionScope.LocalMachine);
            var entry = JsonSerializer.Deserialize<DispatchJournalEntry>(clearText)
                ?? throw new InvalidDataException($"Journal entry '{path}' is empty.");
            entries.Add(entry);
        }
        return entries;
    }

    public Task RemoveAsync(string dispatchId, CancellationToken cancellationToken)
    {
        var path = GetPath(dispatchId);
        if (File.Exists(path)) File.Delete(path);
        return Task.CompletedTask;
    }

    private string GetPath(string dispatchId)
    {
        if (string.IsNullOrWhiteSpace(dispatchId) || dispatchId.IndexOfAny(Path.GetInvalidFileNameChars()) >= 0)
            throw new ArgumentException("Dispatch ID is invalid for a journal filename.", nameof(dispatchId));
        return Path.Combine(_directory, dispatchId + ".dispatch");
    }
}
