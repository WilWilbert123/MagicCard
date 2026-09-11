using KioskAgent.Api;
using KioskAgent.Configuration;
using KioskAgent.Logging;
using KioskAgent.MagicCard;
using KioskAgent.Printers;
using KioskAgent.Security;
using KioskAgent.Services;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// 1. Configure Serilog structured logging
AgentLogger.ConfigureLogging(builder);

// 2. Enable Windows Service integration (allows KioskAgent to run as a Windows Service or standalone console app)
builder.Services.AddWindowsService(options =>
{
    options.ServiceName = "EmployeeIDKioskAgent";
});

// 3. Bind strongly-typed options
builder.Services.Configure<KioskOptions>(builder.Configuration.GetSection(KioskOptions.SectionName));
builder.Services.Configure<PrinterOptions>(builder.Configuration.GetSection(PrinterOptions.SectionName));
builder.Services.Configure<MagicCardOptions>(builder.Configuration.GetSection(MagicCardOptions.SectionName));
builder.Services.Configure<SecurityOptions>(builder.Configuration.GetSection(SecurityOptions.SectionName));

// 4. Register Services & Dependencies
builder.Services.AddSingleton<ILocalAgentAuthentication, LocalAgentAuthentication>();
builder.Services.AddSingleton<HttpClient>();

// Determine Printer Implementation (Mock vs Windows vs MagicCard)
var printerType = builder.Configuration.GetValue<string>("Printer:Type") ?? "MagicCard";
var useMock = builder.Configuration.GetValue<bool>("Printer:UseMock");

if (useMock)
{
    builder.Services.AddSingleton<ICardPrinter, MockCardPrinter>();
}
else if (string.Equals(printerType, "Windows", StringComparison.OrdinalIgnoreCase))
{
    builder.Services.AddSingleton<ICardPrinter, WindowsCardPrinter>();
}
else
{
    // Default to Mock for safe execution if physical printer is not present
    builder.Services.AddSingleton<ICardPrinter, MockCardPrinter>();
}

builder.Services.AddSingleton<IMagicCardAdapter, MagicCardTrustIdAdapter>();
builder.Services.AddSingleton<IPrintJobService, PrintJobService>();
builder.Services.AddSingleton<IKioskRegistrationService, KioskRegistrationService>();

// Register Background Services
builder.Services.AddHostedService<HeartbeatService>();

// 5. Configure CORS (allow local Next.js frontend calls from Vercel + localhost)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowLocalKioskOrigins", policy =>
    {
        policy.WithOrigins(
                "https://magic-card-trust-id.vercel.app",  // Production Vercel deployment
                "http://localhost:3000",                     // Local development
                "http://localhost:3001",
                "https://localhost:3000"
              )
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var port = builder.Configuration.GetValue<int>("Kiosk:Port", 7125);
builder.WebHost.UseUrls($"http://127.0.0.1:{port}");

var app = builder.Build();

app.UseCors("AllowLocalKioskOrigins");

// Global exception handling middleware
app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (Exception ex)
    {
        var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Unhandled exception on path {Path}", context.Request.Path);
        context.Response.StatusCode = 500;
        await context.Response.WriteAsJsonAsync(new
        {
            error = "Internal KioskAgent Error",
            message = ex.Message,
            timestamp = DateTime.UtcNow
        });
    }
});

// 6. Map API Endpoint Routes
app.MapHealthEndpoints();
app.MapKioskEndpoints();
app.MapPrintEndpoints();

Log.Information("Starting KioskAgent. listening on http://127.0.0.1:{Port} (Environment: {Env})",
    port, app.Environment.EnvironmentName);

app.Run();
