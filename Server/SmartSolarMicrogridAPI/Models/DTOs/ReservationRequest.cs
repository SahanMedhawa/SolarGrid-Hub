// ============================================================
// File: ReservationRequest.cs
// Project: SmartSolarMicrogridAPI
// Description: DTO for creating and updating reservations.
// ============================================================

using System.ComponentModel.DataAnnotations;

namespace SmartSolarMicrogridAPI.Models.DTOs
{
    /// <summary>
    /// DTO for creating a new reservation.
    /// </summary>
    public class CreateReservationRequest
    {
        [Required]
        public string ProsumerNic { get; set; } = null!;

        [Required]
        public string SlotId { get; set; } = null!;

        [Required]
        public string NodeId { get; set; } = null!;

        [Required]
        public DateTime ReservationDate { get; set; }

        [Required]
        [Range(0.1, double.MaxValue)]
        public double EnergyKWh { get; set; }
    }

    /// <summary>
    /// DTO for updating an existing reservation.
    /// </summary>
    public class UpdateReservationRequest
    {
        public string? SlotId { get; set; }
        public DateTime? ReservationDate { get; set; }
        public double? EnergyKWh { get; set; }
    }
}
