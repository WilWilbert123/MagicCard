using KioskAgent.Models;
using KioskAgent.Services;

namespace KioskAgent.Api;

public static class PrintEndpoints
{
    public static void MapPrintEndpoints(this IEndpointRouteBuilder app)
    {
        // Handler logic for print jobs
        async Task<IResult> ExecutePrintJob(PrintRequest request, IPrintJobService printJobService, CancellationToken ct)
        {
            if (request == null)
            {
                return Results.BadRequest(new PrintResponse
                {
                    Success = false,
                    Status = "FAILED",
                    ErrorCode = "INVALID_PAYLOAD",
                    ErrorMessage = "Print request payload cannot be empty."
                });
            }

            var result = await printJobService.ProcessPrintJobAsync(request, ct);
            return result.Success ? Results.Ok(result) : Results.UnprocessableEntity(result);
        }

        // POST /api/print
        app.MapPost("/api/print", ExecutePrintJob)
           .WithName("SubmitPrintJob")
           .WithTags("Printing");

        // POST /print (alias for backwards compatibility)
        app.MapPost("/print", ExecutePrintJob)
           .WithName("SubmitPrintJobAlias")
           .WithTags("Printing");

        // POST /api/print/test
        app.MapPost("/api/print/test", async (IPrintJobService printJobService, CancellationToken ct) =>
        {
            var testRequest = new PrintRequest
            {
                RequestId = $"TEST-REQ-{Guid.NewGuid().ToString("N")[..8]}",
                EmployeeId = "EMP-TEST-001",
                EmployeeNumber = "EMP-001",
                TemplateId = "template-test-01",
                FrontData = new Dictionary<string, string> { { "name", "Test Employee" } }
            };

            var result = await printJobService.ProcessPrintJobAsync(testRequest, ct);
            return Results.Ok(result);
        })
        .WithName("TestPrintJob")
        .WithTags("Printing");
    }
}
