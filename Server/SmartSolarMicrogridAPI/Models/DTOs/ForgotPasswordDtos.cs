// ============================================================
// File: ForgotPasswordDtos.cs
// Project: SmartSolarMicrogridAPI
// Description: Request DTOs for the simplified (no-email)
//              forgot password flow.
// ============================================================

namespace SmartSolarMicrogridAPI.Models.DTOs
{
    public class ForgotPasswordVerifyRequest
    {
        public string UsernameOrNic { get; set; } = null!;
        public string LoginType { get; set; } = null!; // "Prosumer" or "User"
    }

    public class ForgotPasswordResetRequest
    {
        public string UsernameOrNic { get; set; } = null!;
        public string LoginType { get; set; } = null!;
        public string NewPassword { get; set; } = null!;
    }
}