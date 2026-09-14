using System.Drawing;
using System.Drawing.Printing;
using System.IO;
using Microsoft.Extensions.Options;
using KioskAgent.Configuration;
using KioskAgent.Models;

namespace KioskAgent.Printers;

public class WindowsCardPrinter : ICardPrinter
{
    private readonly PrinterOptions _printerOptions;
    private readonly ILogger<WindowsCardPrinter> _logger;

    public string PrinterName => _printerOptions.Name;

    public WindowsCardPrinter(
        IOptions<PrinterOptions> printerOptions,
        ILogger<WindowsCardPrinter> logger)
    {
        _printerOptions = printerOptions.Value;
        _logger = logger;
    }

    public Task<bool> IsAvailableAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var targetPrinter = string.IsNullOrEmpty(_printerOptions.Name)
                ? new PrinterSettings().PrinterName
                : _printerOptions.Name;

            foreach (string printer in PrinterSettings.InstalledPrinters)
            {
                if (printer.Equals(targetPrinter, StringComparison.OrdinalIgnoreCase))
                {
                    var settings = new PrinterSettings { PrinterName = printer };
                    return Task.FromResult(settings.IsValid);
                }
            }
            return Task.FromResult(false);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error detecting Windows printer availability for {PrinterName}", _printerOptions.Name);
            return Task.FromResult(false);
        }
    }

    public Task<string> GetPrinterStatusAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var targetPrinter = string.IsNullOrEmpty(_printerOptions.Name)
                ? new PrinterSettings().PrinterName
                : _printerOptions.Name;

            var settings = new PrinterSettings { PrinterName = targetPrinter };
            if (!settings.IsValid)
            {
                return Task.FromResult($"PRINTER_UNAVAILABLE ({targetPrinter} not found)");
            }

            return Task.FromResult("READY");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking printer status for {PrinterName}", _printerOptions.Name);
            return Task.FromResult("ERROR_CHECKING_STATUS");
        }
    }

    public Task<List<SystemPrinterInfo>> GetInstalledPrintersAsync(CancellationToken cancellationToken = default)
    {
        var list = new List<SystemPrinterInfo>();
        try
        {
            var defaultPrinter = new PrinterSettings().PrinterName;
            foreach (string printerName in PrinterSettings.InstalledPrinters)
            {
                var settings = new PrinterSettings { PrinterName = printerName };
                list.Add(new SystemPrinterInfo
                {
                    Name = printerName,
                    IsDefault = printerName.Equals(defaultPrinter, StringComparison.OrdinalIgnoreCase),
                    IsOnline = settings.IsValid,
                    Status = settings.IsValid ? "READY" : "OFFLINE"
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error enumerating installed Windows printers");
        }
        return Task.FromResult(list);
    }

    public async Task<PrinterPrintResult> PrintCardAsync(PrintRequest request, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Sending print job for Request ID: {RequestId} to Windows printer: {PrinterName}",
            request.RequestId, PrinterName);

        try
        {
            // Verify printer availability
            var isAvailable = await IsAvailableAsync(cancellationToken);
            if (!isAvailable)
            {
                return new PrinterPrintResult
                {
                    Success = false,
                    ErrorCode = "PRINTER_UNAVAILABLE",
                    ErrorMessage = $"Configured printer '{PrinterName}' is offline or not installed on this KIOSK."
                };
            }

            var targetPrinter = string.IsNullOrEmpty(_printerOptions.Name)
                ? new PrinterSettings().PrinterName
                : _printerOptions.Name;

            // Execute physical spooling to Windows Print Spooler
            await SendToWindowsPrintSpoolerAsync(request, targetPrinter);

            return new PrinterPrintResult
            {
                Success = true,
                JobId = $"WIN-SPOOL-{Guid.NewGuid().ToString("N")[..8].ToUpper()}",
                CompletedAt = DateTime.UtcNow
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Windows card printing failed for Request ID: {RequestId}", request.RequestId);
            return new PrinterPrintResult
            {
                Success = false,
                ErrorCode = "PRINT_SPOOL_FAILED",
                ErrorMessage = ex.Message
            };
        }
    }

    private Task SendToWindowsPrintSpoolerAsync(PrintRequest request, string printerName)
    {
        return Task.Run(() =>
        {
            using var printDoc = new PrintDocument();
            printDoc.PrinterSettings.PrinterName = printerName;

            Image? cardImage = null;
            if (!string.IsNullOrEmpty(request.FrontCanvasDataUrl))
            {
                try
                {
                    var base64Data = request.FrontCanvasDataUrl;
                    if (base64Data.Contains(","))
                    {
                        base64Data = base64Data.Split(',')[1];
                    }
                    var bytes = Convert.FromBase64String(base64Data);
                    using var ms = new MemoryStream(bytes);
                    cardImage = Image.FromStream(ms);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Could not decode FrontCanvasDataUrl base64 string, falling back to text drawing");
                }
            }

            printDoc.PrintPage += (sender, e) =>
            {
                if (e.Graphics != null)
                {
                    if (cardImage != null)
                    {
                        // Draw card image to page bounds
                        e.Graphics.DrawImage(cardImage, e.PageBounds);
                    }
                    else
                    {
                        // Draw standard card fallback
                        using var fontTitle = new Font("Arial", 16, FontStyle.Bold);
                        using var fontSub = new Font("Arial", 12, FontStyle.Regular);
                        using var brush = new SolidBrush(Color.Black);

                        e.Graphics.DrawString("EMPLOYEE ID CARD", fontTitle, brush, new PointF(20, 20));
                        e.Graphics.DrawString($"ID: {request.EmployeeNumber ?? request.EmployeeId}", fontSub, brush, new PointF(20, 60));
                        if (!string.IsNullOrEmpty(request.EmployeeId))
                        {
                            e.Graphics.DrawString($"Name: {request.EmployeeId}", fontSub, brush, new PointF(20, 90));
                        }
                    }
                }
                e.HasMorePages = false;
            };

            printDoc.Print();
        });
    }
}

