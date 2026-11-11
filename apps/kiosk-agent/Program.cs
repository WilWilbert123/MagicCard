using KioskAgent.Api;
using KioskAgent.Configuration;
using KioskAgent.Logging;
using KioskAgent.MagicCard;
using KioskAgent.Printers;
using KioskAgent.Security;
using KioskAgent.Services;
using Serilog;

var baseDir = AppContext.BaseDirectory;
Directory.SetCurrentDirectory(baseDir);

var builder = WebApplication.CreateBuilder(new WebApplicationOptions
{
    Args = args,
    ContentRootPath = baseDir
});

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
builder.Services.AddSingleton<HttpClient>(sp =>
{
    var client = new HttpClient();
    client.DefaultRequestHeaders.Add("User-Agent", "EmployeeID-KioskAgent/1.0.0");
    client.Timeout = TimeSpan.FromSeconds(15);
    return client;
});

// Determine Printer Implementation (Mock vs Windows vs MagicCard)
var printerType = builder.Configuration.GetValue<string>("Printer:Type") ?? "MagicCard";
var useMock = builder.Configuration.GetValue<bool>("Printer:UseMock");

if (useMock)
{
    builder.Services.AddSingleton<ICardPrinter, MockCardPrinter>();
}
else
{
    // Register WindowsCardPrinter for live physical hardware printing via Windows Print Spooler
    builder.Services.AddSingleton<ICardPrinter, WindowsCardPrinter>();
}

builder.Services.AddSingleton<IMagicCardAdapter, MagicCardTrustIdAdapter>();
builder.Services.AddSingleton<IPrintJobService, PrintJobService>();
builder.Services.AddSingleton<IKioskRegistrationService, KioskRegistrationService>();

// Register Background Services
builder.Services.AddHostedService<HeartbeatService>();
builder.Services.AddHostedService<PrintQueueWorkerService>();

// 5. Configure CORS (allow local Next.js frontend calls from any local origin, Vercel, or LAN)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowLocalKioskOrigins", policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var port = builder.Configuration.GetValue<int>("Kiosk:Port", 7125);
builder.WebHost.UseUrls($"http://127.0.0.1:{port}");

var app = builder.Build();

// Private Network Access (PNA) & CORS preflight handling for Chrome / Edge from cloud origins (e.g. bismacard.vercel.app)
app.Use(async (context, next) =>
{
    context.Response.Headers["Access-Control-Allow-Private-Network"] = "true";
    var origin = context.Request.Headers.Origin.ToString();
    context.Response.Headers["Access-Control-Allow-Origin"] = string.IsNullOrEmpty(origin) ? "*" : origin;
    context.Response.Headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS, PUT, DELETE";
    context.Response.Headers["Access-Control-Allow-Headers"] = "*";
    context.Response.Headers["Access-Control-Allow-Credentials"] = "true";

    if (HttpMethods.IsOptions(context.Request.Method))
    {
        context.Response.StatusCode = StatusCodes.Status204NoContent;
        return;
    }

    await next();
});

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
