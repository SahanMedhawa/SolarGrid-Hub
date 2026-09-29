// ============================================================
// File: Reservation.cs
// Project: SmartSolarMicrogridAPI
// Description: Represents an energy trading reservation made
//              by a prosumer. Includes date, start/end time
//              window, requested energy, allocated slot IDs,
//              and QR code data for transfer verification.
//              Capacity is evaluated per time window — not
//              permanently consumed.
// ============================================================

using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SmartSolarMicrogridAPI.Models
{
    /// <summary>
    /// Energy reservation/booking entity with time-window-based capacity.
    /// </summary>
    [BsonIgnoreExtraElements]
    public class Reservation
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        /// <summary>
        /// NIC of the prosumer who made the reservation.
        /// </summary>
        [BsonElement("prosumerNic")]
        public string ProsumerNic { get; set; } = null!;

        /// <summary>
        /// Reference to the microgrid node.
        /// </summary>
        [BsonElement("nodeId")]
        public string NodeId { get; set; } = null!;

        /// <summary>
        /// Date of the reservation (date portion only).
        /// </summary>
        [BsonElement("reservationDate")]
        public DateTime ReservationDate { get; set; }

        /// <summary>
        /// Start time of the reservation window (e.g., "09:00").
        /// </summary>
        [BsonElement("startTime")]
        public string StartTime { get; set; } = null!;

        /// <summary>
        /// End time of the reservation window (e.g., "10:00").
        /// </summary>
        [BsonElement("endTime")]
        public string EndTime { get; set; } = null!;

        /// <summary>
        /// Energy amount in kWh being traded.
        /// </summary>
        [BsonElement("energyKWh")]
        public double EnergyKWh { get; set; }

        /// <summary>
        /// IDs of the battery slots allocated to this reservation.
        /// Slots are occupied only during the reservation's time window.
        /// </summary>
        [BsonElement("allocatedSlotIds")]
        public List<string> AllocatedSlotIds { get; set; } = new();

        /// <summary>
        /// Status: "Pending", "Approved", "Cancelled", "Completed"
        /// </summary>
        [BsonElement("status")]
        public string Status { get; set; } = "Pending";

        /// <summary>
        /// Secure QR code data for transaction verification.
        /// </summary>
        [BsonElement("qrCodeData")]
        public string? QrCodeData { get; set; }

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [BsonElement("updatedAt")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
