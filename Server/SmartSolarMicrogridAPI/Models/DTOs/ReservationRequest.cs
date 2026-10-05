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
        /// End time of the booking window. Automatically set by the system to exactly one hour after StartTime.
        /// </summary>
        public string? EndTime { get; set; }

        [Range(0.0, double.MaxValue)]
        public double EnergyKWh { get; set; }

        /// <summary>
        /// Specific battery slot IDs selected by the prosumer.
        /// When provided, the system allocates these actual slots and
        /// sets EnergyKWh to the sum of their capacities.
        /// </summary>
        public List<string>? SelectedSlotIds { get; set; }
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
        public List<string>? SelectedSlotIds { get; set; }
    }
}
