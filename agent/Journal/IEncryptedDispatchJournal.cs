using CyberPrintPay.Agent.Contracts;

namespace CyberPrintPay.Agent.Journal;

public interface IEncryptedDispatchJournal
{
    Task SaveAsync(DispatchJournalEntry entry, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<DispatchJournalEntry>> ReadAllAsync(CancellationToken cancellationToken);
    Task RemoveAsync(string dispatchId, CancellationToken cancellationToken);
}
