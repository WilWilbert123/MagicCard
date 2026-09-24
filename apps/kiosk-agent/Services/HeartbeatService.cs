namespace KioskAgent.Services;

public class HeartbeatService : BackgroundService
{
    private readonly IKioskRegistrationService _registrationService;
    private readonly ILogger<HeartbeatService> _logger;
    private readonly TimeSpan _interval = TimeSpan.FromSeconds(15);

    public HeartbeatService(
        IKioskRegistrationService registrationService,
        ILogger<HeartbeatService> logger)
    {
        _registrationService = registrationService;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("KioskAgent background HeartbeatService started. Ping interval: {Interval}s", _interval.TotalSeconds);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await _registrationService.SendHeartbeatAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Heartbeat cycle encountered an exception");
            }

            try
            {
                await Task.Delay(_interval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }

        _logger.LogInformation("KioskAgent background HeartbeatService stopped.");
    }
}
