// ============================================================
// File: PasswordValidator.cs
// Project: SmartSolarMicrogridAPI
// Description: Shared strong-password validation used by both
//              the forgot-password flow and self-service
//              password change, so the rule stays identical
//              across every entry point.
// ============================================================

using System.Linq;

namespace SmartSolarMicrogridAPI.Utils
{
    public static class PasswordValidator
    {
        private const string SpecialChars = "!@#$%^&*()_+-=[]{}|;:,.<>?";

        /// <summary>
        /// Validates a password against the strong-password policy:
        /// min 8 characters, at least one uppercase, one lowercase,
        /// one digit, and one special character.
        /// </summary>
        public static bool IsValid(string? password, out string errorMessage)
        {
            errorMessage = string.Empty;

            if (string.IsNullOrWhiteSpace(password))
            {
                errorMessage = "Password is required.";
                return false;
            }

            if (password.Length < 8)
            {
                errorMessage = "Password must be at least 8 characters long.";
                return false;
            }

            if (!password.Any(char.IsUpper))
            {
                errorMessage = "Password must contain at least one uppercase letter.";
                return false;
            }

            if (!password.Any(char.IsLower))
            {
                errorMessage = "Password must contain at least one lowercase letter.";
                return false;
            }

            if (!password.Any(char.IsDigit))
            {
                errorMessage = "Password must contain at least one number.";
                return false;
            }

            if (!password.Any(c => SpecialChars.Contains(c)))
            {
                errorMessage = "Password must contain at least one special character (e.g. ! @ # $ % ^ & *).";
                return false;
            }

            return true;
        }
    }
}