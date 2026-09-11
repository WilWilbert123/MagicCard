using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using KioskAgent.Configuration;

namespace KioskAgent.Security;

public class DeviceCredentials
{
    public string KioskId { get; set; } = string.Empty;
    public string DeviceToken { get; set; } = string.Empty;
    public string MachineName { get; set; } = string.Empty;
    public DateTime PairedAt { get; set; }
}

public interface ILocalAgentAuthentication
{
    bool ValidateRequestToken(HttpContext context);
    Task<DeviceCredentials?> LoadCredentialsAsync();
    Task SaveCredentialsAsync(DeviceCredentials credentials);
    bool IsPaired();
}

public class LocalAgentAuthentication : ILocalAgentAuthentication
{
    private readonly SecurityOptions _options;
    private readonly ILogger<LocalAgentAuthentication> _logger;
    private readonly string _credentialsPath;

    public LocalAgentAuthentication(
        IOptions<SecurityOptions> options,
        ILogger<LocalAgentAuthentication> logger)
    {
        _options = options.Value;
        _logger = logger;
        
        var appDataFolder = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
            "EmployeeID", "KioskAgent");
        Directory.CreateDirectory(appDataFolder);
        _credentialsPath = Path.Combine(appDataFolder, "credentials.json");
    }

    public bool ValidateRequestToken(HttpContext context)
    {
        if (!_options.RequireLocalToken)
            return true;

        if (context.Request.Headers.TryGetValue("X-Kiosk-Agent-Secret", out var tokenHeader))
        {
            return string.Equals(tokenHeader.ToString(), _options.AgentSecret, StringComparison.Ordinal);
        }

        return false;
    }

    public bool IsPaired()
    {
        return File.Exists(_credentialsPath);
    }

    public async Task<DeviceCredentials?> LoadCredentialsAsync()
    {
        if (!File.Exists(_credentialsPath))
            return null;

        try
        {
            var json = await File.ReadAllTextAsync(_credentialsPath);
            return JsonSerializer.Deserialize<DeviceCredentials>(json);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to read agent credentials file at {Path}", _credentialsPath);
            return null;
        }
    }

    public async Task SaveCredentialsAsync(DeviceCredentials credentials)
    {
        try
        {
            var json = JsonSerializer.Serialize(credentials, new JsonSerializerOptions { WriteIndented = true });
            await File.WriteAllTextAsync(_credentialsPath, json);
            _logger.LogInformation("Saved agent pairing credentials for {KioskId} to {Path}", credentials.KioskId, _credentialsPath);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to save agent credentials to {Path}", _credentialsPath);
            throw;
        }
    }
}
