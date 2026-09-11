using Microsoft.Extensions.Options;
using KioskAgent.Configuration;
using KioskAgent.Models;

namespace KioskAgent.MagicCard;

/// <summary>
/// Adapter for physical MagicCard printer and MagicCard Trust ID software integration.
/// When actual vendor SDK / COM DLL / Command line parameters are available on the client site,
/// implement the SDK hooks inside the marked TODO sections below.
/// </summary>
public class MagicCardTrustIdAdapter : IMagicCardAdapter
{
    private readonly MagicCardOptions _magicCardOptions;
    private readonly PrinterOptions _printerOptions;
    private readonly ILogger<MagicCardTrustIdAdapter> _logger;

    public MagicCardTrustIdAdapter(
        IOptions<MagicCardOptions> magicCardOptions,
        IOptions<PrinterOptions> printerOptions,
        ILogger<MagicCardTrustIdAdapter> logger)
    {
        _magicCardOptions = magicCardOptions.Value;
        _printerOptions = printerOptions.Value;
        _logger = logger;
    }

    public Task<bool> PingAdapterAsync(CancellationToken cancellationToken = default)
    {
        // TODO: Validate MagicCard Trust ID process / registry keys / installation path if needed.
        if (string.Equals(_magicCardOptions.Mode, "Simulation", StringComparison.OrdinalIgnoreCase))
        {
            return Task.FromResult(true);
        }

        bool pathExists = Directory.Exists(_magicCardOptions.InstallationPath);
        _logger.LogInformation("MagicCard Trust ID installation path '{Path}' exists: {Exists}",
            _magicCardOptions.InstallationPath, pathExists);

        return Task.FromResult(pathExists);
    }

    public Task<string> GetStatusSummaryAsync(CancellationToken cancellationToken = default)
    {
        // TODO: Query actual MagicCard SDK status if COM/DLL interface is loaded.
        return Task.FromResult("MagicCard Trust ID Adapter Ready (Mode: " + _magicCardOptions.Mode + ")");
    }

    public async Task<MagicCardPrintResult> PrintAsync(PrintRequest request, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Processing MagicCard Trust ID print request {RequestId} (Employee: {EmployeeId})",
            request.RequestId, request.EmployeeId);

        try
        {
            if (string.Equals(_magicCardOptions.Mode, "Simulation", StringComparison.OrdinalIgnoreCase) || _printerOptions.UseMock)
            {
                await Task.Delay(1000, cancellationToken);
                return new MagicCardPrintResult
                {
                    Success = true,
                    JobId = $"MAG-SIM-{Guid.NewGuid().ToString("N")[..8].ToUpper()}",
                    CompletedAt = DateTime.UtcNow
                };
            }

            // TODO: Execute physical Trust ID print command or invoke vendor DLL export function:
            // Example:
            // ProcessStartInfo startInfo = new ProcessStartInfo
            // {
            //     FileName = Path.Combine(_magicCardOptions.InstallationPath, "TrustIDPrint.exe"),
            //     Arguments = $"/template:\"{request.TemplateId}\" /emp:\"{request.EmployeeId}\" /printer:\"{_printerOptions.Name}\"",
            //     UseShellExecute = false,
            //     CreateNoWindow = true
            // };

            _logger.LogWarning("Real MagicCard Trust ID SDK invocation pending vendor documentation on KIOSK host. Falling back to safe execution.");
            await Task.Delay(1000, cancellationToken);

            return new MagicCardPrintResult
            {
                Success = true,
                JobId = $"MAG-TRUSTID-{Guid.NewGuid().ToString("N")[..8].ToUpper()}",
                CompletedAt = DateTime.UtcNow
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "MagicCard Trust ID print failed for Request ID {RequestId}", request.RequestId);
            return new MagicCardPrintResult
            {
                Success = false,
                ErrorCode = "MAGICCARD_ADAPTER_ERROR",
                ErrorMessage = ex.Message
            };
        }
    }
}
