using System.ComponentModel.DataAnnotations;

namespace SmartSolarMicrogridAPI.Models.DTOs
{
    public class ProsumerUpdateRequest
    {
        [Required]
        public string FirstName { get; set; } = null!;

        [Required]
        public string LastName { get; set; } = null!;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = null!;

        [Required]
        [RegularExpression(@"^07\d{8}$", ErrorMessage = "Enter a valid Sri Lankan mobile number (e.g. 0771234567).")]
        public string Phone { get; set; } = null!;

        [Required]
        public string Address { get; set; } = null!;
    }
}