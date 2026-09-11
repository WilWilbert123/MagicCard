using System.Collections.Concurrent;
using KioskAgent.MagicCard;
using KioskAgent.Models;
using KioskAgent.Printers;

namespace KioskAgent.Services;

public interface IPrintJobService
{
    Task<PrintResponse> ProcessPrintJobAsync(PrintRequest request, CancellationToken cancellationToken = default);
    int GetQueueCount();
}

public class PrintJobRecord
{
    public string RequestId { get; set; } = string.Empty;
    public string JobId { get; set; } = string.Empty;
    public string EmployeeId { get; set; } = string.Empty;
    public string Status { get; set; } = "CREATED";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
    public string? ErrorMessage { get; set; }
}

public class PrintJobService : IPrintJobService
{
    private readonly ICardPrinter _printer;
    private readonly IMagicCardAdapter _magicCardAdapter;
    private readonly ILogger<PrintJobService> _logger;

    // Thread-safe dictionary storing processed print jobs for idempotency check
    private static readonly ConcurrentDictionary<string, PrintJobRecord> ProcessedJobs = new();

    public PrintJobService(
        ICardPrinter printer,
        IMagicCardAdapter magicCardAdapter,
        ILogger<PrintJobService> logger)
    {
        _printer = printer;
        _magicCardAdapter = magicCardAdapter;
        _logger = logger;
    }

    public int GetQueueCount()
    {
        return ProcessedJobs.Values.Count(j => j.Status == "QUEUED" || j.Status == "PRINTING");
    }

    public async Task<PrintResponse> ProcessPrintJobAsync(PrintRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.RequestId))
        {
            return new PrintResponse
            {
                Success = false,
                Status = "FAILED",
                ErrorCode = "INVALID_REQUEST",
                ErrorMessage = "RequestId is required for print jobs."
            };
        }

        // 1. Check Idempotency: Prevent duplicate print jobs for identical requestId
        if (ProcessedJobs.TryGetValue(request.RequestId, out var existingRecord))
        {
            _logger.LogWarning("Duplicate print job request received for Request ID: {RequestId}. Returning existing state: {Status}",
                request.RequestId, existingRecord.Status);

            return new PrintResponse
            {
                Success = existingRecord.Status == "COMPLETED",
                RequestId = request.RequestId,
                JobId = existingRecord.JobId,
                Status = existingRecord.Status,
                ErrorMessage = existingRecord.ErrorMessage,
                Timestamp = existingRecord.CompletedAt ?? DateTime.UtcNow
            };
        }

        var record = new PrintJobRecord
        {
            RequestId = request.RequestId,
            EmployeeId = request.EmployeeId,
            Status = "CREATED",
            CreatedAt = DateTime.UtcNow
        };
        ProcessedJobs.TryAdd(request.RequestId, record);

        _logger.LogInformation("Print job state machine initialized: CREATED (RequestId: {RequestId}, Employee: {EmployeeId})",
            request.RequestId, request.EmployeeId);

        try
        {
            // 2. State: VALIDATING
            record.Status = "VALIDATING";
            if (string.IsNullOrWhiteSpace(request.EmployeeId))
            {
                record.Status = "FAILED";
                record.ErrorMessage = "Missing required Employee ID.";
                return CreateFailedResponse(request.RequestId, "VALIDATION_ERROR", record.ErrorMessage);
            }

            var printerAvailable = await _printer.IsAvailableAsync(cancellationToken);
            if (!printerAvailable)
            {
                record.Status = "FAILED";
                record.ErrorMessage = $"Physical printer '{_printer.PrinterName}' is unavailable or offline.";
                _logger.LogError("Print job validation failed: {Error}", record.ErrorMessage);
                return CreateFailedResponse(request.RequestId, "PRINTER_OFFLINE", record.ErrorMessage);
            }

            // 3. State: QUEUED
            record.Status = "QUEUED";
            _logger.LogInformation("Print job queued for Request ID: {RequestId}", request.RequestId);

            // 4. State: PRINTING
            record.Status = "PRINTING";
            _logger.LogInformation("Executing physical card print for Request ID: {RequestId}", request.RequestId);

            PrinterPrintResult printResult;
            if (_printer is WindowsCardPrinter)
            {
                // Execute standard Windows print spooling
                printResult = await _printer.PrintCardAsync(request, cancellationToken);
            }
            else
            {
                // Execute MagicCard Trust ID printing
                var magResult = await _magicCardAdapter.PrintAsync(request, cancellationToken);
                printResult = new PrinterPrintResult
                {
                    Success = magResult.Success,
                    JobId = magResult.JobId,
                    ErrorCode = magResult.ErrorCode,
                    ErrorMessage = magResult.ErrorMessage,
                    CompletedAt = magResult.CompletedAt
                };
            }

            if (!printResult.Success)
            {
                record.Status = "FAILED";
                record.ErrorMessage = printResult.ErrorMessage ?? "Hardware print execution failed.";
                _logger.LogError("Print job failed during PRINTING state for Request ID {RequestId}: {Error}",
                    request.RequestId, record.ErrorMessage);

                return CreateFailedResponse(request.RequestId, printResult.ErrorCode ?? "PRINT_EXECUTION_FAILED", record.ErrorMessage);
            }

            // 5. State: COMPLETED
            record.Status = "COMPLETED";
            record.JobId = printResult.JobId;
            record.CompletedAt = DateTime.UtcNow;

            _logger.LogInformation("Print job COMPLETED successfully! Request ID: {RequestId}, Job ID: {JobId}",
                request.RequestId, record.JobId);

            return new PrintResponse
            {
                Success = true,
                RequestId = request.RequestId,
                JobId = record.JobId,
                Status = "COMPLETED",
                Timestamp = record.CompletedAt.Value
            };
        }
        catch (Exception ex)
        {
            record.Status = "FAILED";
            record.ErrorMessage = ex.Message;
            _logger.LogError(ex, "Unhandled exception in PrintJobService for Request ID {RequestId}", request.RequestId);
            return CreateFailedResponse(request.RequestId, "INTERNAL_ERROR", ex.Message);
        }
    }

    private static PrintResponse CreateFailedResponse(string requestId, string errorCode, string errorMessage)
    {
        return new PrintResponse
        {
            Success = false,
            RequestId = requestId,
            Status = "FAILED",
            ErrorCode = errorCode,
            ErrorMessage = errorMessage,
            Timestamp = DateTime.UtcNow
        };
    }
}
