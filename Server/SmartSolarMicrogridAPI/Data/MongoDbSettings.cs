// ============================================================
// File: MongoDbSettings.cs
// Project: SmartSolarMicrogridAPI
// Description: Configuration POCO for MongoDB connection settings.
// ============================================================

namespace SmartSolarMicrogridAPI.Data
{
    /// <summary>
    /// Holds MongoDB connection configuration values bound from appsettings.json.
    /// </summary>
    public class MongoDbSettings
    {
        public string ConnectionString { get; set; } = null!;
        public string DatabaseName { get; set; } = null!;
    }
}
