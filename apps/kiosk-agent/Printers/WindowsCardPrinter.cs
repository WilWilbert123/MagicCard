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

    private string? _targetPrinterOverride;
    private string? _duplexModeOverride = "Duplex"; // "Duplex" | "SingleSided" | "Auto"
    private double _offsetXmm = 0.0;
    private double _offsetYmm = 0.0;
    private string _ribbonTypeOverride = "YMCKO";

    // Known ID Card Printer manufacturers and brand driver keywords
    private static readonly string[] CardPrinterKeywords = new[]
    {
        "Magicard", "Zebra", "Evolis", "Fargo", "Datacard", "Entrust",
        "Matica", "Nisca", "Pointman", "Smart", "Badgy", "Primacy",
        "Zenius", "DTC", "HDP", "ZC100", "ZC300", "ZXP", "TrustID", "Card"
    };

    public string PrinterName => ResolveTargetPrinterName() ?? _targetPrinterOverride ?? _printerOptions.Name;
    public string CurrentTargetPrinter => ResolveTargetPrinterName() ?? _targetPrinterOverride ?? (!string.IsNullOrEmpty(_printerOptions.Name) ? _printerOptions.Name : "Default Printer");
    public string ActiveDuplexMode => _duplexModeOverride ?? "Duplex";
    public string ActiveRibbonType => _ribbonTypeOverride;

    public void Configure(string targetPrinter, string? duplexMode = null, double? offsetXmm = null, double? offsetYmm = null, string? ribbonType = null)
    {
        if (!string.IsNullOrWhiteSpace(targetPrinter))
        {
            _targetPrinterOverride = targetPrinter.Trim();
        }
        if (!string.IsNullOrWhiteSpace(duplexMode))
        {
            _duplexModeOverride = duplexMode.Trim();
        }
        if (offsetXmm.HasValue)
        {
            _offsetXmm = offsetXmm.Value;
        }
        if (offsetYmm.HasValue)
        {
            _offsetYmm = offsetYmm.Value;
        }
        if (!string.IsNullOrWhiteSpace(ribbonType))
        {
            _ribbonTypeOverride = ribbonType.Trim();
        }

        _logger.LogInformation("WindowsCardPrinter dynamic config updated: Target='{Target}', Duplex='{Duplex}', Offset=({X}mm, {Y}mm), Ribbon='{Ribbon}'",
            _targetPrinterOverride ?? _printerOptions.Name, _duplexModeOverride, _offsetXmm, _offsetYmm, _ribbonTypeOverride);
    }

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
        var configured = !string.IsNullOrWhiteSpace(_targetPrinterOverride) 
            ? _targetPrinterOverride 
            : _printerOptions.Name;

        // 1. If configured target is explicitly specified
        if (!string.IsNullOrWhiteSpace(configured) && !configured.Equals("AUTO", StringComparison.OrdinalIgnoreCase))
        {
            // Exact match
            foreach (string printer in PrinterSettings.InstalledPrinters)
            {
                if (printer.Equals(configured, StringComparison.OrdinalIgnoreCase))
                    return printer;
            }

            // Substring match (e.g. "ZC300", "Primacy", "600 NEO", "Magicard")
            foreach (string printer in PrinterSettings.InstalledPrinters)
            {
                if (printer.Contains(configured, StringComparison.OrdinalIgnoreCase) ||
                    configured.Contains(printer, StringComparison.OrdinalIgnoreCase))
                    return printer;
            }
        }

        // 2. Intelligent Auto-Discovery: Search for ANY recognized ID card printer
        foreach (string printer in PrinterSettings.InstalledPrinters)
        {
            foreach (var keyword in CardPrinterKeywords)
            {
                if (printer.Contains(keyword, StringComparison.OrdinalIgnoreCase))
                {
                    _logger.LogInformation("Auto-discovered physical ID Card printer: {PrinterName} (Matched keyword: {Keyword})", printer, keyword);
                    return printer;
                }
            }
        }

        // 3. Fallback to Windows default printer if valid
        try
        {
            var defaultPrinter = new PrinterSettings().PrinterName;
            if (!string.IsNullOrEmpty(defaultPrinter))
            {
                return defaultPrinter;
            }
        }
        catch
        {
            // Ignore default printer resolution errors
        }

        // 4. Return first installed printer if available
        if (PrinterSettings.InstalledPrinters.Count > 0)
        {
            return PrinterSettings.InstalledPrinters[0];
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

            bool isSingleSided = _duplexModeOverride?.Equals("SingleSided", StringComparison.OrdinalIgnoreCase) == true;

            // Enable Duplex (Back-to-Back) printing if supported by driver and not forced to single-sided
            if (!isSingleSided && printDoc.PrinterSettings.CanDuplex)
            {
                printDoc.PrinterSettings.Duplex = Duplex.Vertical;
            }

            // Decode Front & Back Canvas Images
            Image? frontImage = DecodeBase64Image(request.FrontCanvasDataUrl);
            Image? backImage = DecodeBase64Image(request.BackCanvasDataUrl);

            // Automatically detect orientation from input card graphic (Portrait vs Landscape)
            bool isPortrait = false;
            if (frontImage != null && frontImage.Height > frontImage.Width)
            {
                isPortrait = true;
            }
            else if (backImage != null && backImage.Height > backImage.Width)
            {
                isPortrait = true;
            }

            // Set CR80 card orientation and zero margins for full edge-to-edge bleed card printing
            printDoc.DefaultPageSettings.Landscape = !isPortrait;
            printDoc.DefaultPageSettings.Margins = new Margins(0, 0, 0, 0);
            printDoc.OriginAtMargins = false;

            // Select High Resolution printer setting (300 DPI)
            foreach (PrinterResolution res in printDoc.PrinterSettings.PrinterResolutions)
            {
                if (res.Kind == PrinterResolutionKind.High || res.Y >= 300)
                {
                    printDoc.DefaultPageSettings.PrinterResolution = res;
                    break;
                }
            }

            int currentPage = 1;
            // Only spool back page if back graphic exists AND not restricted to single-sided mode
            bool hasBackPage = !isSingleSided && (backImage != null || !string.IsNullOrEmpty(request.BackCanvasDataUrl));

            // Convert mm alignment offsets to 1/100 inch (1 mm = ~3.937 hundredths of an inch)
            int offsetXUnits = (int)Math.Round(_offsetXmm * 3.937);
            int offsetYUnits = (int)Math.Round(_offsetYmm * 3.937);

            printDoc.PrintPage += (sender, e) =>
            {
                if (e.Graphics != null)
                {
                    // Ultra High-Quality rendering configuration for CR80 dye-sublimation
                    e.Graphics.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
                    e.Graphics.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.HighQuality;
                    e.Graphics.PixelOffsetMode = System.Drawing.Drawing2D.PixelOffsetMode.HighQuality;
                    e.Graphics.CompositingQuality = System.Drawing.Drawing2D.CompositingQuality.HighQuality;
                    e.Graphics.TextRenderingHint = System.Drawing.Text.TextRenderingHint.ClearTypeGridFit;

                    // Apply calibrated print alignment offset bounds
                    Rectangle targetBounds = new Rectangle(
                        e.PageBounds.X + offsetXUnits,
                        e.PageBounds.Y + offsetYUnits,
                        e.PageBounds.Width,
                        e.PageBounds.Height
                    );

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

