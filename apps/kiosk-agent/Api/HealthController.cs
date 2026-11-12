using KioskAgent.Configuration;
using KioskAgent.Models;
using KioskAgent.Printers;
using Microsoft.Extensions.Options;

namespace KioskAgent.Api;

public static class HealthEndpoints
{
    public static void MapHealthEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/health", Handler)
           .WithName("GetHealth")
           .WithTags("Health");

        app.MapGet("/api/health", Handler)
           .WithName("GetApiHealth")
           .WithTags("Health");

        app.MapGet("/api/machine-id", () =>
        {
            try
            {
                uint serial = GetWindowsDriveSerialNumber("C:\\");
                return Results.Ok(new
                {
                    success = true,
                    serialNumber = serial > 0 ? serial.ToString() : "675683451",
                    hex = serial.ToString("X4"),
                    source = "GetVolumeInformation"
                });
            }
            catch (Exception ex)
            {
                return Results.Ok(new
                {
                    success = false,
                    serialNumber = "675683451",
                    error = ex.Message
                });
            }
        })
        .WithName("GetMachineId")
        .WithTags("System");

        async Task<IResult> Handler(
            ICardPrinter printer,
            IOptions<KioskOptions> kioskOptions,
            CancellationToken ct)
        {
            var isAvailable = await printer.IsAvailableAsync(ct);
            var statusStr = await printer.GetPrinterStatusAsync(ct);

            var health = new AgentHealth
            {
                Status = isAvailable ? "healthy" : "degraded",
                KioskId = kioskOptions.Value.KioskId,
                AgentVersion = "1.0.0",
                PrinterConnected = isAvailable,
                PrinterModel = !string.IsNullOrWhiteSpace(printer.CurrentTargetPrinter) ? printer.CurrentTargetPrinter : printer.PrinterName,
                PrinterStatus = statusStr,
                SystemTime = DateTime.UtcNow
            };

            return Results.Ok(health);
        }
    }

    [System.Runtime.InteropServices.DllImport("kernel32.dll", CharSet = System.Runtime.InteropServices.CharSet.Auto, SetLastError = true)]
    private static extern bool GetVolumeInformation(
        string rootPathName,
        System.Text.StringBuilder? volumeNameBuffer,
        uint volumeNameSize,
        out uint volumeSerialNumber,
        out uint maximumComponentLength,
        out uint fileSystemFlags,
        System.Text.StringBuilder? fileSystemNameBuffer,
        uint fileSystemNameSize);

    private static uint GetWindowsDriveSerialNumber(string drive)
    {
        if (!OperatingSystem.IsWindows()) return 675683451;

        uint serial = 0;
        uint maxComp = 0;
        uint flags = 0;
        if (GetVolumeInformation(drive, null, 0, out serial, out maxComp, out flags, null, 0))
        {
            return serial;
        }
        return 675683451;
    }
}
