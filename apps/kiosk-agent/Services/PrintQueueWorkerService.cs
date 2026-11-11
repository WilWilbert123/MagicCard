using System.Net.Http.Json;
using Microsoft.Extensions.Options;
using KioskAgent.Configuration;
using KioskAgent.Models;

namespace KioskAgent.Services;

public class PendingJobModel
{
    public string Id { get; set; } = string.Empty;
    public string EmployeeId { get; set; } = string.Empty;
    public string EmployeeNumber { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string TargetPrinter { get; set; } = string.Empty;
    public string DuplexMode { get; set; } = "Duplex";
    public string FrontCanvasDataUrl { get; set; } = string.Empty;
    public string BackCanvasDataUrl { get; set; } = string.Empty;
    public string IdempotencyKey { get; set; } = string.Empty;
}

public class PendingJobsResponse
{
    public List<PendingJobModel>? Jobs { get; set; }
}

public class PrintQueueWorkerService : BackgroundService
{
    private readonly KioskOptions _kioskOptions;
    private readonly IPrintJobService _printJobService;
    private readonly HttpClient _httpClient;
    private readonly ILogger<PrintQueueWorkerService> _logger;
    private readonly TimeSpan _pollInterval = TimeSpan.FromSeconds(1.5);

    public PrintQueueWorkerService(
        IOptions<KioskOptions> kioskOptions,
        IPrintJobService printJobService,
        HttpClient httpClient,
        ILogger<PrintQueueWorkerService> logger)
    {
        _kioskOptions = kioskOptions.Value;
        _printJobService = printJobService;
        _httpClient = httpClient;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("PrintQueueWorkerService started. Polling cloud print queue every {Interval}s...", _pollInterval.TotalSeconds);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var candidateUrls = new List<string>();
                if (!string.IsNullOrWhiteSpace(_kioskOptions.SupabaseUrl))
                {
                    candidateUrls.Add(_kioskOptions.SupabaseUrl.TrimEnd('/'));
                }
                candidateUrls.Add("https://bismaccard.vercel.app");
                candidateUrls.Add("https://bismaccard.vercel.app/");
                candidateUrls.Add("https://bismaccard.vercel.app/");
                candidateUrls.Add("http://localhost:3000");

                foreach (var baseUrl in candidateUrls.Distinct())
                {
                    var endpoint = $"{baseUrl}/api/print-jobs/queue";
                    try
                    {
                        var response = await _httpClient.GetAsync(endpoint, stoppingToken);
                        if (response.IsSuccessStatusCode)
                        {
                            var data = await response.Content.ReadFromJsonAsync<PendingJobsResponse>(cancellationToken: stoppingToken);
                            if (data?.Jobs != null && data.Jobs.Count > 0)
                            {
                                foreach (var job in data.Jobs)
                                {
                                    _logger.LogInformation("Processing print job: {JobId} for employee {EmpName} ({EmpNum}). Target: {Printer}",
                                        job.Id, job.EmployeeName, job.EmployeeNumber, job.TargetPrinter);

                                    var printRequest = new PrintRequest
                                    {
                                        RequestId = job.Id,
                                        IdempotencyKey = job.IdempotencyKey,
                                        EmployeeId = job.EmployeeId,
                                        EmployeeNumber = job.EmployeeNumber,
                                        TemplateId = "default-cr80",
                                        FrontCanvasDataUrl = job.FrontCanvasDataUrl,
                                        BackCanvasDataUrl = job.BackCanvasDataUrl,
                                        TargetPrinter = job.TargetPrinter,
                                        DuplexMode = job.DuplexMode,
                                        FrontData = new Dictionary<string, string>
                                        {
                                            ["FullName"] = job.EmployeeName,
                                            ["EmployeeNumber"] = job.EmployeeNumber,
                                            ["Department"] = "Corporate"
                                        }
                                    };

                                    var printResult = await _printJobService.ProcessPrintJobAsync(printRequest, stoppingToken);

                                    // Notify server of print completion
                                    var patchPayload = new
                                    {
                                        jobId = job.Id,
                                        status = printResult.Success ? "COMPLETED" : "FAILED",
                                        error = printResult.ErrorMessage
                                    };

                                    var patchMsg = new HttpRequestMessage(HttpMethod.Patch, endpoint)
                                    {
                                        Content = JsonContent.Create(patchPayload)
                                    };

                                    await _httpClient.SendAsync(patchMsg, stoppingToken);

                                    _logger.LogInformation("Print job {JobId} status updated: {Status}",
                                        job.Id, printResult.Success ? "COMPLETED" : "FAILED");
                                }
                                break;
                            }
                        }
                    }
                    catch { }
                }
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Print queue poll cycle encountered an error");
            }

            try
            {
                await Task.Delay(_pollInterval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }

        _logger.LogInformation("PrintQueueWorkerService stopped.");
    }
}
