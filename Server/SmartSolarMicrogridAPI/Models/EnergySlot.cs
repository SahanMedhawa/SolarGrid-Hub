// ============================================================
// File: EnergySlot.cs
// Project: SmartSolarMicrogridAPI
// Description: Represents a physical battery storage slot
//              within a microgrid node. Each slot has a fixed
//              capacity (kWh) and can be Available or under
//              Maintenance. Capacity availability for reservations
//              is evaluated per time window, not permanently.
// ============================================================

using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SmartSolarMicrogridAPI.Models
{
    /// <summary>
    /// Physical battery storage slot within a microgrid node.
    /// </summary>
    [BsonIgnoreExtraElements]
    public class EnergySlot
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        /// <summary>
        /// Reference to the parent MicrogridNode.
        /// </summary>
        [BsonElement("nodeId")]
        public string NodeId { get; set; } = null!;

        [BsonElement("slotNumber")]
        public int SlotNumber { get; set; }

        /// <summary>
        /// Fixed energy capacity of this battery slot (kWh).
        /// </summary>
        [BsonElement("availableKWh")]
        public double AvailableKWh { get; set; }

        /// <summary>
        /// Status: "Available" or "Maintenance"
        /// Available = operational, can be allocated to reservations.
        /// Maintenance = under maintenance, excluded from capacity calculations.
        /// </summary>
        [BsonElement("status")]
        public string Status { get; set; } = "Available";

        [BsonElement("maintenanceDate")]
        public DateTime? MaintenanceDate { get; set; }

        [BsonElement("maintenanceStartTime")]
        public string? MaintenanceStartTime { get; set; }

        [BsonElement("maintenanceEndTime")]
        public string? MaintenanceEndTime { get; set; }

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
