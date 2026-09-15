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
            var targetPrinter = ResolveTargetPrinterName();
            if (string.IsNullOrEmpty(targetPrinter))
            {
                _logger.LogWarning("No matching printer found for target name '{ConfiguredName}'. Installed printers: [{Printers}]",
                    _printerOptions.Name, string.Join(", ", PrinterSettings.InstalledPrinters.Cast<string>()));
                return Task.FromResult(false);
            }

            var settings = new PrinterSettings { PrinterName = targetPrinter };
            return Task.FromResult(settings.IsValid);
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
            var targetPrinter = ResolveTargetPrinterName();
            if (string.IsNullOrEmpty(targetPrinter))
            {
                return Task.FromResult($"PRINTER_UNAVAILABLE (No installed printer matches '{_printerOptions.Name}')");
            }

            var settings = new PrinterSettings { PrinterName = targetPrinter };
            if (!settings.IsValid)
            {
                return Task.FromResult($"PRINTER_OFFLINE ({targetPrinter})");
            }

            return Task.FromResult($"READY ({targetPrinter})");
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

    private string? ResolveTargetPrinterName()
    {
        var configured = _printerOptions.Name;
        if (string.IsNullOrWhiteSpace(configured))
        {
            return new PrinterSettings().PrinterName;
        }

        // 1. Exact match
        foreach (string printer in PrinterSettings.InstalledPrinters)
        {
            if (printer.Equals(configured, StringComparison.OrdinalIgnoreCase))
                return printer;
        }

        // 2. Substring match (e.g. "Magicard" or "600NEO" or "Magicard 600")
        foreach (string printer in PrinterSettings.InstalledPrinters)
        {
            if (printer.Contains(configured, StringComparison.OrdinalIgnoreCase) ||
                configured.Contains(printer, StringComparison.OrdinalIgnoreCase))
                return printer;
        }

        // 3. Fallback search for any Magicard driver
        foreach (string printer in PrinterSettings.InstalledPrinters)
        {
            if (printer.Contains("Magicard", StringComparison.OrdinalIgnoreCase))
                return printer;
        }

        return null;
    }

    public async Task<PrinterPrintResult> PrintCardAsync(PrintRequest request, CancellationToken cancellationToken = default)
    {
        var resolvedPrinter = ResolveTargetPrinterName();
        _logger.LogInformation("Sending card print job for Request ID: {RequestId} (Employee: {EmployeeId}) to printer: {PrinterName}",
            request.RequestId, request.EmployeeNumber ?? request.EmployeeId, resolvedPrinter ?? _printerOptions.Name);

        try
        {
            if (string.IsNullOrEmpty(resolvedPrinter))
            {
                var installedList = string.Join(", ", PrinterSettings.InstalledPrinters.Cast<string>());
                _logger.LogWarning("Card print failed: No installed Windows printer matches '{Configured}'. Installed: [{Installed}]",
                    _printerOptions.Name, installedList);

                return new PrinterPrintResult
                {
                    Success = false,
                    ErrorCode = "PRINTER_UNAVAILABLE",
                    ErrorMessage = $"No physical printer matching '{_printerOptions.Name}' was found on Windows. Installed printers: [{installedList}]"
                };
            }

            // Execute physical spooling to Windows Print Spooler
            await SendToWindowsPrintSpoolerAsync(request, resolvedPrinter);

            _logger.LogInformation("Successfully spooled card print job to physical USB printer '{PrinterName}' for Request ID: {RequestId}",
                resolvedPrinter, request.RequestId);

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
            printDoc.PrinterSettings.Copies = 1;

            // Enable Duplex (Back-to-Back) printing if supported by driver
            if (printDoc.PrinterSettings.CanDuplex)
            {
                printDoc.PrinterSettings.Duplex = Duplex.Vertical;
            }

            // Set CR80 card landscape orientation and 0 margins for edge-to-edge card printing
            printDoc.DefaultPageSettings.Landscape = true;
            printDoc.DefaultPageSettings.Margins = new Margins(0, 0, 0, 0);

            // Select High Resolution printer setting (300 DPI)
            foreach (PrinterResolution res in printDoc.PrinterSettings.PrinterResolutions)
            {
                if (res.Kind == PrinterResolutionKind.High)
                {
                    printDoc.DefaultPageSettings.PrinterResolution = res;
                    break;
                }
            }

            // Decode Front & Back Canvas Images
            Image? frontImage = DecodeBase64Image(request.FrontCanvasDataUrl);
            Image? backImage = DecodeBase64Image(request.BackCanvasDataUrl);

            int currentPage = 1;
            bool hasBackPage = backImage != null || !string.IsNullOrEmpty(request.BackCanvasDataUrl);

            printDoc.PrintPage += (sender, e) =>
            {
                if (e.Graphics != null)
                {
                    // Ultra High-Quality rendering configuration for Magicard 600NEO dye-sublimation
                    e.Graphics.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
                    e.Graphics.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.HighQuality;
                    e.Graphics.PixelOffsetMode = System.Drawing.Drawing2D.PixelOffsetMode.HighQuality;
                    e.Graphics.CompositingQuality = System.Drawing.Drawing2D.CompositingQuality.HighQuality;
                    e.Graphics.TextRenderingHint = System.Drawing.Text.TextRenderingHint.ClearTypeGridFit;

                    var targetBounds = e.MarginBounds.Width > 0 ? e.MarginBounds : e.PageBounds;

                    if (currentPage == 1)
                    {
                        // Render Page 1 (FRONT SIDE OF CARD)
                        if (frontImage != null)
                        {
                            e.Graphics.DrawImage(frontImage, targetBounds);
                        }
                        else
                        {
                            DrawCardFallbackText(e.Graphics, request, "FRONT SIDE");
                        }

                        // If back page image exists, signal to print engine to flip card and print Page 2!
                        if (hasBackPage)
                        {
                            e.HasMorePages = true;
                            currentPage = 2;
                        }
                        else
                        {
                            e.HasMorePages = false;
                        }
                    }
                    else if (currentPage == 2)
                    {
                        // Render Page 2 (BACK SIDE OF CARD - AUTOMATIC DUPLEX FLIP)
                        if (backImage != null)
                        {
                            e.Graphics.DrawImage(backImage, targetBounds);
                        }
                        else
                        {
                            DrawCardFallbackText(e.Graphics, request, "BACK SIDE");
                        }

                        e.HasMorePages = false;
                    }
                }
            };

            printDoc.Print();
        });
    }

    private Image? DecodeBase64Image(string? dataUrl)
    {
        if (string.IsNullOrEmpty(dataUrl)) return null;
        try
        {
            var base64Data = dataUrl;
            if (base64Data.Contains(","))
            {
                base64Data = base64Data.Split(',')[1];
            }
            var bytes = Convert.FromBase64String(base64Data);
            using var ms = new MemoryStream(bytes);
            return Image.FromStream(ms);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not decode base64 image string for card rendering");
            return null;
        }
    }

    private static void DrawCardFallbackText(Graphics g, PrintRequest request, string sideName)
    {
        using var fontTitle = new Font("Arial", 16, FontStyle.Bold);
        using var fontSub = new Font("Arial", 12, FontStyle.Regular);
        using var brush = new SolidBrush(Color.Black);

        g.DrawString($"EMPLOYEE ID CARD ({sideName})", fontTitle, brush, new PointF(20, 20));
        g.DrawString($"ID: {request.EmployeeNumber ?? request.EmployeeId}", fontSub, brush, new PointF(20, 60));
    }
}

