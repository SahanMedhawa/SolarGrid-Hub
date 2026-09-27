// ============================================================
// File: IProsumerService.cs
// Project: SmartSolarMicrogridAPI
// Description: Interface for prosumer profile management.
// ============================================================

using SmartSolarMicrogridAPI.Models;
using SmartSolarMicrogridAPI.Models.DTOs;

namespace SmartSolarMicrogridAPI.Services
{
    /// <summary>
    /// Defines operations for managing solar prosumer profiles.
    /// </summary>
    public interface IProsumerService
    {
        // Retrieves all prosumer profiles.
        Task<List<Prosumer>> GetAllAsync();

        // Retrieves a prosumer by NIC.
        Task<Prosumer?> GetByNicAsync(string nic);

        // Retrieves all prosumers with a given status.
        Task<List<Prosumer>> GetByStatusAsync(string status);

        // Registers a new prosumer.
        Task<Prosumer> RegisterAsync(ProsumerRegistrationRequest request);

        // Updates prosumer profile.
        Task<bool> UpdateAsync(string nic, ProsumerUpdateRequest request);

        // Requests account deactivation (sets status to "Deactivated").
        Task<bool> DeactivateAsync(string nic);

        // Reactivates a prosumer account (Backoffice only).
        Task<bool> ActivateAsync(string nic);
    }
}
