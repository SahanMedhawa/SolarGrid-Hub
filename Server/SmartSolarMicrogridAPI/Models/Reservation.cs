// ============================================================
// File: Reservation.cs
// Project: SmartSolarMicrogridAPI
// Description: Represents an energy trading reservation made
//              by a prosumer for a specific energy slot.
// ============================================================

using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SmartSolarMicrogridAPI.Models
{
    /// <summary>
    /// Energy reservation/booking entity.
    /// </summary>
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
        /// Reference to the energy slot.
        /// </summary>
        [BsonElement("slotId")]
        public string SlotId { get; set; } = null!;

        /// <summary>
        /// Reference to the microgrid node.
        /// </summary>
        [BsonElement("nodeId")]
        public string NodeId { get; set; } = null!;

        [BsonElement("reservationDate")]
        public DateTime ReservationDate { get; set; }

        /// <summary>
        /// Energy amount in kWh being traded.
        /// </summary>
        [BsonElement("energyKWh")]
        public double EnergyKWh { get; set; }

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
