using System.Net.Http.Json;
using Microsoft.Extensions.Options;
using KioskAgent.Configuration;
using KioskAgent.Models;
using KioskAgent.Security;

namespace KioskAgent.Services;

public interface IKioskRegistrationService
{
    Task<PairingResponse> RegisterKioskAsync(PairingRequest request, CancellationToken cancellationToken = default);
    Task<bool> SendHeartbeatAsync(CancellationToken cancellationToken = default);
}

public class KioskRegistrationService : IKioskRegistrationService
{
    private readonly KioskOptions _kioskOptions;
    private readonly ILocalAgentAuthentication _auth;
    private readonly HttpClient _httpClient;
    private readonly ILogger<KioskRegistrationService> _logger;

    public KioskRegistrationService(
        IOptions<KioskOptions> kioskOptions,
        ILocalAgentAuthentication auth,
        HttpClient httpClient,
        ILogger<KioskRegistrationService> logger)
    {
        _kioskOptions = kioskOptions.Value;
        _auth = auth;
        _httpClient = httpClient;
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

    public async Task<bool> SendHeartbeatAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(_kioskOptions.SupabaseUrl))
                return true;

            var creds = await _auth.LoadCredentialsAsync();
            var endpoint = $"{_kioskOptions.SupabaseUrl.TrimEnd('/')}/api/kiosks/heartbeat";
            
            var payload = new
            {
                kioskCode = _kioskOptions.KioskId,
                deviceToken = creds?.DeviceToken,
                agentVersion = "1.0.0",
                printerStatus = "READY",
                cpuUsagePct = 2.5,
                memoryUsagePct = 45.0,
                timestamp = DateTime.UtcNow
            };

            var response = await _httpClient.PostAsJsonAsync(endpoint, payload, cancellationToken);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Heartbeat update failed to central server (KioskAgent operating normally)");
            return false;
        }
    }
}
