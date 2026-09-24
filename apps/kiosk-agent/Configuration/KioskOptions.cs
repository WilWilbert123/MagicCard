namespace KioskAgent.Configuration;

public class KioskOptions
{
    public const string SectionName = "Kiosk";

    public string KioskId { get; set; } = string.Empty;
    public int Port { get; set; } = 7125;
    public string BranchId { get; set; } = string.Empty;
    public string SupabaseUrl { get; set; } = string.Empty;
    public string SupabaseApiKey { get; set; } = string.Empty;
    public string AgentVersion { get; set; } = "v1.4.0";
}

public class PrinterOptions
{
    public const string SectionName = "Printer";

    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = "MagicCard"; // "MagicCard" or "Windows"
    public bool UseMock { get; set; } = false; // Set false in production with hardware connected
}

public class MagicCardOptions
{
    public const string SectionName = "MagicCard";

    public string Mode { get; set; } = "Simulation"; // "Production" or "Simulation"
    public string InstallationPath { get; set; } = @"C:\Program Files\Magicard\TrustID\";
    public string ConfigurationPath { get; set; } = @"C:\ProgramData\Magicard\TrustID\config.xml";
}

public class SecurityOptions
{
    public const string SectionName = "Security";

    public string AgentSecret { get; set; } = string.Empty;
    public bool RequireLocalToken { get; set; } = false;
}
