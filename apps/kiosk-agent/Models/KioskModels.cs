namespace KioskAgent.Models;

public class PrintRequest
{
    public string RequestId { get; set; } = string.Empty;
    public string EmployeeId { get; set; } = string.Empty;
    public string EmployeeNumber { get; set; } = string.Empty;
    public string TemplateId { get; set; } = string.Empty;
    public string? FrontCanvasDataUrl { get; set; }
    public string? BackCanvasDataUrl { get; set; }
    public Dictionary<string, string>? FrontData { get; set; }
    public Dictionary<string, string>? BackData { get; set; }
}

public class PrintResponse
{
    public bool Success { get; set; }
    public string RequestId { get; set; } = string.Empty;
    public string JobId { get; set; } = string.Empty;
    public string Status { get; set; } = "QUEUED"; // CREATED, VALIDATING, QUEUED, PRINTING, COMPLETED, FAILED
    public string? ErrorCode { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

public class AgentHealth
{
    public string Status { get; set; } = "healthy"; // healthy, degraded, unhealthy
    public string KioskId { get; set; } = string.Empty;
    public string AgentVersion { get; set; } = "1.0.0";
    public bool PrinterConnected { get; set; }
    public string PrinterModel { get; set; } = "Unknown";
    public string PrinterStatus { get; set; } = "READY";
    public DateTime SystemTime { get; set; } = DateTime.UtcNow;
}

public class KioskStatus
{
    public string KioskId { get; set; } = string.Empty;
    public string BranchId { get; set; } = string.Empty;
    public string Status { get; set; } = "ONLINE";
    public string AgentVersion { get; set; } = "1.0.0";
    public int Port { get; set; } = 7125;
    public bool IsPaired { get; set; }
    public string PrinterName { get; set; } = string.Empty;
    public string PrinterStatus { get; set; } = "READY";
    public int RibbonLevelPct { get; set; } = 100;
    public int CardCountTotal { get; set; } = 0;
    public int ActiveJobsCount { get; set; } = 0;
    public DateTime LastHeartbeat { get; set; } = DateTime.UtcNow;
}

public class PairingRequest
{
    public string KioskId { get; set; } = string.Empty;
    public string BranchId { get; set; } = string.Empty;
    public string PairingCode { get; set; } = string.Empty;
    public string MachineName { get; set; } = Environment.MachineName;
}

public class PairingResponse
{
    public bool Success { get; set; }
    public string KioskId { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? DeviceToken { get; set; }
}

public class SystemPrinterInfo
{
    public string Name { get; set; } = string.Empty;
    public bool IsDefault { get; set; }
    public bool IsOnline { get; set; }
    public string Status { get; set; } = "READY";
}
