using System.ComponentModel.DataAnnotations;

namespace SmartSolarMicrogridAPI.Models.DTOs
{
    public class CreateEnergySlotRequest
    {
        [Required]
        public string NodeId { get; set; } = null!;

        [Range(0.1, double.MaxValue)]
        public double AvailableKWh { get; set; }
    }
}
