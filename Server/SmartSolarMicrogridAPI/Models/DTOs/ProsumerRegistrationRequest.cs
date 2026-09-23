// ============================================================
// File: ProsumerRegistrationRequest.cs
// Project: SmartSolarMicrogridAPI
// Description: DTO for prosumer registration from mobile app.
// ============================================================

using System.ComponentModel.DataAnnotations;

namespace SmartSolarMicrogridAPI.Models.DTOs
{
    /// <summary>
    /// DTO for new prosumer registration.
    /// </summary>
    public class ProsumerRegistrationRequest
    {
        [Required]
        public string NIC { get; set; } = null!;

        [Required]
        public string FirstName { get; set; } = null!;

        [Required]
        public string LastName { get; set; } = null!;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = null!;

        [Required]
        public string Phone { get; set; } = null!;

        [Required]
        public string Address { get; set; } = null!;

        [Required]
        [MinLength(6)]
        public string Password { get; set; } = null!;
    }
}
