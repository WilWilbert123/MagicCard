using KioskAgent.Models;

namespace KioskAgent.Printers;

public class PrinterPrintResult
{
    public bool Success { get; set; }
    public string JobId { get; set; } = string.Empty;
    public string? ErrorCode { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime CompletedAt { get; set; } = DateTime.UtcNow;
}

public interface ICardPrinter
{
    string PrinterName { get; }
    Task<bool> IsAvailableAsync(CancellationToken cancellationToken = default);
    Task<string> GetPrinterStatusAsync(CancellationToken cancellationToken = default);
    Task<List<SystemPrinterInfo>> GetInstalledPrintersAsync(CancellationToken cancellationToken = default);
    Task<PrinterPrintResult> PrintCardAsync(PrintRequest request, CancellationToken cancellationToken = default);
}
