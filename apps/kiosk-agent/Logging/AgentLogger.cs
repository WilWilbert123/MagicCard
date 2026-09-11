using Serilog;
using Serilog.Events;

namespace KioskAgent.Logging;

public static class AgentLogger
{
    public static void ConfigureLogging(WebApplicationBuilder builder)
    {
        var logFolder = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
            "EmployeeID", "KioskAgent", "logs");

        Directory.CreateDirectory(logFolder);
        var logFilePath = Path.Combine(logFolder, "agent-.log");

        Log.Logger = new LoggerConfiguration()
            .MinimumLevel.Information()
            .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
            .MinimumLevel.Override("Microsoft.Hosting.Lifetime", LogEventLevel.Information)
            .Enrich.FromLogContext()
            .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}")
            .WriteTo.File(
                path: logFilePath,
                rollingInterval: RollingInterval.Day,
                retainedFileCountLimit: 14,
                outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] [{SourceContext}] {Message:lj}{NewLine}{Exception}")
            .CreateLogger();

        builder.Host.UseSerilog();
    }
}
