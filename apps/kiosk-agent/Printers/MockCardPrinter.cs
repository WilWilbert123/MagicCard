using KioskAgent.Models;

namespace KioskAgent.Printers;

public class MockCardPrinter : ICardPrinter
{
    private readonly ILogger<MockCardPrinter> _logger;

    public string PrinterName => "Magicard 300 Duo (Mock)";

    public MockCardPrinter(ILogger<MockCardPrinter> logger)
    {
        _logger = logger;
    }

    public Task<bool> IsAvailableAsync(CancellationToken cancellationToken = default)
    {
        return Task.FromResult(true);
    }

    public Task<string> GetPrinterStatusAsync(CancellationToken cancellationToken = default)
    {
        return Task.FromResult("READY (Ribbon 94% | Hopper 150 Cards)");
    }

    public Task<List<SystemPrinterInfo>> GetInstalledPrintersAsync(CancellationToken cancellationToken = default)
    {
        var list = new List<SystemPrinterInfo>
        {
            new SystemPrinterInfo
            {
                Name = "Magicard 300 Duo (Mock)",
                IsDefault = true,
                IsOnline = true,
                Status = "READY"
            },
            new SystemPrinterInfo
            {
                Name = "Microsoft Print to PDF",
                IsDefault = false,
                IsOnline = true,
                Status = "READY"
            }
        };

        return Task.FromResult(list);
    }

    public async Task<PrinterPrintResult> PrintCardAsync(PrintRequest request, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("[MOCK PRINTER] Starting print sequence for Request ID: {RequestId}, Employee: {EmployeeId}",
            request.RequestId, request.EmployeeId);

        // Simulate physical printing delay (1.2 seconds)
        await Task.Delay(1200, cancellationToken);

        _logger.LogInformation("[MOCK PRINTER] Physical YMCKO card printing complete for Request ID: {RequestId}", request.RequestId);

        return new PrinterPrintResult
        {
            Success = true,
            JobId = $"MOCK-JOB-{Guid.NewGuid().ToString("N")[..8].ToUpper()}",
            CompletedAt = DateTime.UtcNow
        };
    }
}
