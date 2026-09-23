// ============================================================
// File: IAuthService.cs
// Project: SmartSolarMicrogridAPI
// Description: Interface for authentication service operations.
// ============================================================

using SmartSolarMicrogridAPI.Models;
using SmartSolarMicrogridAPI.Models.DTOs;

namespace SmartSolarMicrogridAPI.Services
{
    /// <summary>
    /// Defines authentication operations for users and prosumers.
    /// </summary>
    public interface IAuthService
    {
        // Authenticates a user or prosumer and returns a JWT token.
        Task<LoginResponse?> LoginAsync(LoginRequest request);

        // Generates a JWT token for a given user.
        string GenerateJwtToken(string userId, string role, string displayName);
    }
}
