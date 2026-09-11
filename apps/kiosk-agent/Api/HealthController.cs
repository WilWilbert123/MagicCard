using KioskAgent.Configuration;
using KioskAgent.Models;
using KioskAgent.Printers;
using Microsoft.Extensions.Options;

namespace KioskAgent.Api;

public static class HealthEndpoints
{
    public static void MapHealthEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/health", async (
            ICardPrinter printer,
            IOptions<KioskOptions> kioskOptions,
            CancellationToken ct) =>
        {
            var isAvailable = await printer.IsAvailableAsync(ct);
            var statusStr = await printer.GetPrinterStatusAsync(ct);

            var health = new AgentHealth
            {
                Status = isAvailable ? "healthy" : "degraded",
                KioskId = kioskOptions.Value.KioskId,
                AgentVersion = "1.0.0",
                PrinterConnected = isAvailable,
                PrinterModel = printer.PrinterName,
                PrinterStatus = statusStr,
                SystemTime = DateTime.UtcNow
            };

            return Results.Ok(health);
        })
        .WithName("GetHealth")
        .WithTags("Health");
    }
}
