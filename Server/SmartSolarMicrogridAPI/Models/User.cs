// ============================================================
// File: User.cs
// Project: SmartSolarMicrogridAPI
// Description: Represents a web application user with role-based
//              access (Backoffice or Grid Operator).
// ============================================================

using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SmartSolarMicrogridAPI.Models
{
    /// <summary>
    /// Web application user entity stored in the Users collection.
    /// </summary>
    public class User
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        [BsonElement("username")]
        public string Username { get; set; } = null!;

        [BsonElement("email")]
        public string Email { get; set; } = null!;

        [BsonElement("passwordHash")]
        public string PasswordHash { get; set; } = null!;

        /// <summary>
        /// Role: "Backoffice" or "GridOperator"
        /// </summary>
        [BsonElement("role")]
        public string Role { get; set; } = null!;

        [BsonElement("isActive")]
        public bool IsActive { get; set; } = true;

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [BsonElement("updatedAt")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
