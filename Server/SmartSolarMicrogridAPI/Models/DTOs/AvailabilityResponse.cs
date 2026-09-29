// ============================================================
// File: AvailabilityResponse.cs
// Project: SmartSolarMicrogridAPI
// Description: DTOs for station availability API responses.
//              Supports both single-window and hourly-breakdown
//              availability queries.
// ============================================================

namespace SmartSolarMicrogridAPI.Models.DTOs
{
    /// <summary>
    /// Availability information for a specific station, date, and time window.
    /// </summary>
    public class AvailabilityResponse
    {
        public string NodeId { get; set; } = null!;
        public string NodeName { get; set; } = null!;
        public string Date { get; set; } = null!;
        public string StartTime { get; set; } = null!;
        public string EndTime { get; set; } = null!;
        public double TotalCapacityKWh { get; set; }
        public double ReservedKWh { get; set; }
        public double AvailableKWh { get; set; }
        public int MaintenanceSlotsCount { get; set; }
        public double MaintenanceCapacityKWh { get; set; }
        public string Schedule { get; set; } = null!;
        public bool IsWithinOperatingHours { get; set; }

        /// <summary>
        /// Detailed list of actual physical battery slots and their availability in this window.
        /// </summary>
        public List<SlotAvailabilityInfo> Slots { get; set; } = new();
    }

    /// <summary>
    /// Information for an individual physical battery slot and its availability in a time window.
    /// </summary>
    public class SlotAvailabilityInfo
    {
        public string Id { get; set; } = null!;
        public int SlotNumber { get; set; }
        public double CapacityKWh { get; set; }
        public string Status { get; set; } = "Available"; // "Available" or "Maintenance"
        public bool IsBooked { get; set; }
        public bool IsAvailable { get; set; }
    }

    /// <summary>
    /// Hourly availability breakdown for a station on a specific date.
    /// </summary>
    public class HourlyAvailabilityResponse
    {
        public string NodeId { get; set; } = null!;
        public string NodeName { get; set; } = null!;
        public string Date { get; set; } = null!;
        public string Schedule { get; set; } = null!;
        public double TotalCapacityKWh { get; set; }
        public List<HourlySlot> HourlySlots { get; set; } = new();
    }

    /// <summary>
    /// Availability data for a single one-hour window.
    /// </summary>
    public class HourlySlot
    {
        public string StartTime { get; set; } = null!;
        public string EndTime { get; set; } = null!;
        public double ReservedKWh { get; set; }
        public double AvailableKWh { get; set; }
        public bool IsWithinOperatingHours { get; set; }
        public bool IsFull { get; set; }
    }
}
