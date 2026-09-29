// ============================================================
// File: ReservationRequest.cs
// Project: SmartSolarMicrogridAPI
// Description: DTOs for creating and updating reservations.
//              Includes start/end time for time-window-based
//              capacity evaluation.
// ============================================================

using System.ComponentModel.DataAnnotations;

namespace SmartSolarMicrogridAPI.Models.DTOs
{
    /// <summary>
    /// DTO for creating a new reservation with time window.
    /// The system allocates battery slots automatically.
    /// </summary>
    public class CreateReservationRequest
    {
        [Required]
        public string ProsumerNic { get; set; } = null!;

        [Required]
        public string NodeId { get; set; } = null!;

        [Required]
        public DateTime ReservationDate { get; set; }

        /// <summary>
        /// Start time of the booking window (e.g., "09:00").
        /// </summary>
        [Required]
        public string StartTime { get; set; } = null!;

        /// <summary>
        /// End time of the booking window (e.g., "10:00").
        /// </summary>
        [Required]
        public string EndTime { get; set; } = null!;

        [Required]
        [Range(0.1, double.MaxValue)]
        public double EnergyKWh { get; set; }
    }

    /// <summary>
    /// DTO for updating an existing reservation.
    /// </summary>
    public class UpdateReservationRequest
    {
        public string? NodeId { get; set; }
        public DateTime? ReservationDate { get; set; }
        public string? StartTime { get; set; }
        public string? EndTime { get; set; }
        public double? EnergyKWh { get; set; }
    }
}
