using KioskAgent.Configuration;
using KioskAgent.Models;
using KioskAgent.Printers;
using KioskAgent.Security;
using KioskAgent.Services;
using Microsoft.Extensions.Options;

namespace KioskAgent.Api;

public static class KioskEndpoints
{
    public static void MapKioskEndpoints(this IEndpointRouteBuilder app)
    {
        // GET /api/kiosk/status
        app.MapGet("/api/kiosk/status", async (
            ICardPrinter printer,
            IPrintJobService printService,
            ILocalAgentAuthentication auth,
            IOptions<KioskOptions> kioskOptions,
            IOptions<PrinterOptions> printerOptions,
            CancellationToken ct) =>
        {
            var printerStatus = await printer.GetPrinterStatusAsync(ct);

            var status = new KioskStatus
            {
                KioskId = kioskOptions.Value.KioskId,
                BranchId = kioskOptions.Value.BranchId,
                Status = "ONLINE",
                AgentVersion = "1.0.0",
                Port = kioskOptions.Value.Port,
                IsPaired = auth.IsPaired(),
                PrinterName = printerOptions.Value.Name,
                PrinterStatus = printerStatus,
                RibbonLevelPct = 94,
                CardCountTotal = 125,
                ActiveJobsCount = printService.GetQueueCount(),
                LastHeartbeat = DateTime.UtcNow
            };

            return Results.Ok(status);
        })
        .WithName("GetKioskStatus")
        .WithTags("Kiosk");

        // GET /api/printers
        app.MapGet("/api/printers", async (ICardPrinter printer, CancellationToken ct) =>
        {
            var printers = await printer.GetInstalledPrintersAsync(ct);
            return Results.Ok(printers);
        })
        .WithName("GetPrinters")
        .WithTags("Kiosk");

        // POST /api/kiosk/register
        app.MapPost("/api/kiosk/register", async (
            PairingRequest request,
            IKioskRegistrationService regService,
            CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(request.PairingCode))
            {
                return Results.BadRequest(new PairingResponse
                {
                    Success = false,
                    Message = "Pairing code is required."
                });
            }

            var response = await regService.RegisterKioskAsync(request, ct);
            return response.Success ? Results.Ok(response) : Results.BadRequest(response);
        })
        .WithName("RegisterKiosk")
        .WithTags("Kiosk");

        // POST /api/kiosk/heartbeat
        app.MapPost("/api/kiosk/heartbeat", async (
            IKioskRegistrationService regService,
            CancellationToken ct) =>
        {
            var success = await regService.SendHeartbeatAsync(ct);
            return Results.Ok(new { success, timestamp = DateTime.UtcNow });
        })
        .WithName("SendKioskHeartbeat")
        .WithTags("Kiosk");
    }
}
