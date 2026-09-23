// ============================================================
// File: MicrogridNode.cs
// Project: SmartSolarMicrogridAPI
// Description: Represents a solar grid hub/node with GPS
//              location, capacity, and battery storage info.
// ============================================================

using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SmartSolarMicrogridAPI.Models
{
    /// <summary>
    /// Microgrid node (solar grid hub) entity.
    /// </summary>
    public class MicrogridNode
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        [BsonElement("nodeName")]
        public string NodeName { get; set; } = null!;

        [BsonElement("location")]
        public string Location { get; set; } = null!;

        [BsonElement("latitude")]
        public double Latitude { get; set; }

        [BsonElement("longitude")]
        public double Longitude { get; set; }

        /// <summary>
        /// Maximum capacity in kW/h.
        /// </summary>
        [BsonElement("capacityKWh")]
        public double CapacityKWh { get; set; }

        /// <summary>
        /// Number of available battery storage slots.
        /// </summary>
        [BsonElement("batterySlots")]
        public int BatterySlots { get; set; }

        [BsonElement("availableBatterySlots")]
        public int AvailableBatterySlots { get; set; }

        /// <summary>
        /// Operating schedule (e.g., "06:00-18:00")
        /// </summary>
        [BsonElement("schedule")]
        public string Schedule { get; set; } = null!;

        [BsonElement("isActive")]
        public bool IsActive { get; set; } = true;

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [BsonElement("updatedAt")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
