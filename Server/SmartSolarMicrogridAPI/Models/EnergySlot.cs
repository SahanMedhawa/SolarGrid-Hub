// ============================================================
// File: EnergySlot.cs
// Project: SmartSolarMicrogridAPI
// Description: Represents an available energy trading slot
//              within a microgrid node.
// ============================================================

using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SmartSolarMicrogridAPI.Models
{
    /// <summary>
    /// Energy booking slot within a microgrid node.
    /// </summary>
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

        [BsonElement("slotDate")]
        public DateTime SlotDate { get; set; }

        [BsonElement("startTime")]
        public string StartTime { get; set; } = null!;

        [BsonElement("endTime")]
        public string EndTime { get; set; } = null!;

        /// <summary>
        /// Energy capacity available in this slot (kWh).
        /// </summary>
        [BsonElement("availableKWh")]
        public double AvailableKWh { get; set; }

        /// <summary>
        /// Status: "Available", "Reserved", "Completed"
        /// </summary>
        [BsonElement("status")]
        public string Status { get; set; } = "Available";

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
