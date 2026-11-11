using System.Net.Http.Json;
using Microsoft.Extensions.Options;
using KioskAgent.Configuration;
using KioskAgent.Models;
using KioskAgent.Security;

using KioskAgent.Printers;

namespace KioskAgent.Services;

public interface IKioskRegistrationService
{
    Task<PairingResponse> RegisterKioskAsync(PairingRequest request, CancellationToken cancellationToken = default);
    Task<bool> SendHeartbeatAsync(CancellationToken cancellationToken = default, string? statusOverride = null);
}

public class KioskRegistrationService : IKioskRegistrationService
{
    private readonly KioskOptions _kioskOptions;
    private readonly PrinterOptions _printerOptions;
    private readonly ILocalAgentAuthentication _auth;
    private readonly HttpClient _httpClient;
    private readonly ICardPrinter _cardPrinter;
    private readonly ILogger<KioskRegistrationService> _logger;

    public KioskRegistrationService(
        IOptions<KioskOptions> kioskOptions,
        IOptions<PrinterOptions> printerOptions,
        ILocalAgentAuthentication auth,
        HttpClient httpClient,
        ICardPrinter cardPrinter,
        ILogger<KioskRegistrationService> logger)
    {
        _kioskOptions = kioskOptions.Value;
        _printerOptions = printerOptions.Value;
        _auth = auth;
        _httpClient = httpClient;
        _cardPrinter = cardPrinter;
        _logger = logger;
    }

    public async Task<PairingResponse> RegisterKioskAsync(PairingRequest request, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Attempting agent pairing for KIOSK {KioskId} with pairing code: {Code}",
            request.KioskId, request.PairingCode);

        try
        {
            if (string.IsNullOrWhiteSpace(_kioskOptions.SupabaseUrl))
            {
                // Local simulation pairing when Supabase URL is not configured
                var simulatedToken = Guid.NewGuid().ToString("N");
                await _auth.SaveCredentialsAsync(new DeviceCredentials
                {
                    KioskId = request.KioskId,
                    DeviceToken = simulatedToken,
                    MachineName = request.MachineName,
                    PairedAt = DateTime.UtcNow
                });

                return new PairingResponse
                {
                    Success = true,
                    KioskId = request.KioskId,
                    Message = "Agent paired successfully (Local Development Mode).",
                    DeviceToken = simulatedToken
                };
            }

            // Call Next.js / Supabase backend pairing API
            var pairEndpoint = $"{_kioskOptions.SupabaseUrl.TrimEnd('/')}/api/kiosks/pair";
            var payload = new
            {
                kioskCode = request.KioskId,
                pairingCode = request.PairingCode,
                machineName = request.MachineName,
                agentVersion = "1.0.0"
            };

            var response = await _httpClient.PostAsJsonAsync(pairEndpoint, payload, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var errorText = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogWarning("Pairing failed from server ({Status}): {Error}", response.StatusCode, errorText);
                return new PairingResponse
                {
                    Success = false,
                    KioskId = request.KioskId,
                    Message = $"Pairing failed: HTTP {(int)response.StatusCode} - {errorText}"
                };
            }

            var result = await response.Content.ReadFromJsonAsync<PairingResponse>(cancellationToken: cancellationToken);
            if (result != null && result.Success && !string.IsNullOrEmpty(result.DeviceToken))
            {
                await _auth.SaveCredentialsAsync(new DeviceCredentials
                {
                    KioskId = request.KioskId,
                    DeviceToken = result.DeviceToken,
                    MachineName = request.MachineName,
                    PairedAt = DateTime.UtcNow
                });
            }

            return result ?? new PairingResponse { Success = false, Message = "Invalid server pairing response." };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during Kiosk pairing workflow for {KioskId}", request.KioskId);
            return new PairingResponse
            {
                Success = false,
                KioskId = request.KioskId,
                Message = ex.Message
            };
        }
    }

    public async Task<bool> SendHeartbeatAsync(CancellationToken cancellationToken = default, string? statusOverride = null)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(_kioskOptions.SupabaseUrl))
            {
                _logger.LogWarning("SupabaseUrl is empty in KioskOptions. Central heartbeat disabled.");
                return true;
            }

            var creds = await _auth.LoadCredentialsAsync();
            var endpoint = $"{_kioskOptions.SupabaseUrl.TrimEnd('/')}/api/kiosks/heartbeat";
            
            var printerStatus = await _cardPrinter.GetPrinterStatusAsync(cancellationToken);
            var installedPrinters = await _cardPrinter.GetInstalledPrintersAsync(cancellationToken);

            int ribbonPct = 100;
            var match = System.Text.RegularExpressions.Regex.Match(printerStatus, @"Ribbon\s*(\d+)%", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
            if (match.Success && int.TryParse(match.Groups[1].Value, out var parsedPct))
            {
                ribbonPct = parsedPct;
            }

            var payload = new
            {
                kioskCode = _kioskOptions.KioskId,
                branchId = _kioskOptions.BranchId,
                deviceToken = creds?.DeviceToken,
                agentVersion = (_kioskOptions.AgentVersion ?? "1.0.0").Length > 30 ? _kioskOptions.AgentVersion![..30] : _kioskOptions.AgentVersion,
                status = (statusOverride ?? "ONLINE").Length > 30 ? (statusOverride ?? "ONLINE")[..30] : (statusOverride ?? "ONLINE"),
                printerStatus = (printerStatus ?? "READY").Length > 90 ? (printerStatus ?? "READY")[..90] : (printerStatus ?? "READY"),
                printerModel = (_cardPrinter.CurrentTargetPrinter ?? "Magicard 600NEO").Length > 90 ? (_cardPrinter.CurrentTargetPrinter ?? "Magicard 600NEO")[..90] : (_cardPrinter.CurrentTargetPrinter ?? "Magicard 600NEO"),
                printerType = "Windows",
                ribbonLevelPct = ribbonPct,
                ribbonType = _cardPrinter.ActiveRibbonType,
                installedPrinters = installedPrinters,
                cpuUsagePct = 2.5,
                memoryUsagePct = 45.0,
                timestamp = DateTime.UtcNow
            };

            var response = await _httpClient.PostAsJsonAsync(endpoint, payload, cancellationToken);
            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("Successfully sent heartbeat ping to central server for KIOSK {KioskId}.", _kioskOptions.KioskId);

                // Synchronize remote printer hardware profile if configured by Admin
                try
                {
                    var hbResult = await response.Content.ReadFromJsonAsync<HeartbeatServerResponse>(cancellationToken: cancellationToken);
                    if (hbResult?.PrinterConfig != null && !string.IsNullOrWhiteSpace(hbResult.PrinterConfig.TargetPrinter))
                    {
                        _cardPrinter.Configure(
                            hbResult.PrinterConfig.TargetPrinter,
                            hbResult.PrinterConfig.DuplexMode,
                            hbResult.PrinterConfig.OffsetXmm,
                            hbResult.PrinterConfig.OffsetYmm,
                            hbResult.PrinterConfig.RibbonType
                        );
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogDebug(ex, "Could not deserialize server printer configuration from heartbeat ACK.");
                }

                return true;
            }
            else
            {
                var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogWarning("Heartbeat ping failed for KIOSK {KioskId} (HTTP {StatusCode}): {Error}", _kioskOptions.KioskId, response.StatusCode, errorBody);
                return false;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Heartbeat connection error for KIOSK {KioskId} to server {Url}", _kioskOptions.KioskId, _kioskOptions.SupabaseUrl);
            return false;
        }
    }
}
