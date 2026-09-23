// ============================================================
// File: LoginRequest.cs
// Project: SmartSolarMicrogridAPI
// Description: Data Transfer Object for login requests.
// ============================================================

using System.ComponentModel.DataAnnotations;

namespace SmartSolarMicrogridAPI.Models.DTOs
{
    /// <summary>
    /// DTO for user/prosumer login.
    /// </summary>
    public class LoginRequest
    {
        [Required]
        public string Username { get; set; } = null!;

        [Required]
        public string Password { get; set; } = null!;

        /// <summary>
        /// Login type: "User" or "Prosumer"
        /// </summary>
        public string LoginType { get; set; } = "User";
    }

    /// <summary>
    /// DTO for login response containing the JWT token.
    /// </summary>
    public class LoginResponse
    {
        public string Token { get; set; } = null!;
        public string Role { get; set; } = null!;
        public string UserId { get; set; } = null!;
        public string DisplayName { get; set; } = null!;
    }
}
