using KioskAgent.Models;

namespace KioskAgent.MagicCard;

public class MagicCardPrintResult
{
    public bool Success { get; set; }
    public string JobId { get; set; } = string.Empty;
    public string? ErrorCode { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime CompletedAt { get; set; } = DateTime.UtcNow;
}

public interface IMagicCardAdapter
{
    Task<bool> PingAdapterAsync(CancellationToken cancellationToken = default);
    Task<string> GetStatusSummaryAsync(CancellationToken cancellationToken = default);
    Task<MagicCardPrintResult> PrintAsync(PrintRequest request, CancellationToken cancellationToken = default);
}
