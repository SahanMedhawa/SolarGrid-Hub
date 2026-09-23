// ============================================================
// File: Prosumer.cs
// Project: SmartSolarMicrogridAPI
// Description: Represents a solar prosumer (property owner
//              with solar panels). NIC is the primary key.
// ============================================================

using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SmartSolarMicrogridAPI.Models
{
    /// <summary>
    /// Solar prosumer profile stored in the Prosumers collection.
    /// NIC (National Identity Card) serves as the primary key.
    /// </summary>
    public class Prosumer
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        /// <summary>
        /// National Identity Card number — unique identifier for the prosumer.
        /// </summary>
        [BsonElement("nic")]
        public string NIC { get; set; } = null!;

        [BsonElement("firstName")]
        public string FirstName { get; set; } = null!;

        [BsonElement("lastName")]
        public string LastName { get; set; } = null!;

        [BsonElement("email")]
        public string Email { get; set; } = null!;

        [BsonElement("phone")]
        public string Phone { get; set; } = null!;

        [BsonElement("address")]
        public string Address { get; set; } = null!;

        [BsonElement("passwordHash")]
        public string PasswordHash { get; set; } = null!;

        /// <summary>
        /// Status: "Pending", "Active", "Deactivated"
        /// </summary>
        [BsonElement("status")]
        public string Status { get; set; } = "Pending";

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [BsonElement("updatedAt")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
