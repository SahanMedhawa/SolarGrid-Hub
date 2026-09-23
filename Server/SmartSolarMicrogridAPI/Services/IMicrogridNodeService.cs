// ============================================================
// File: IMicrogridNodeService.cs
// Project: SmartSolarMicrogridAPI
// Description: Interface for microgrid node management.
// ============================================================

using SmartSolarMicrogridAPI.Models;

namespace SmartSolarMicrogridAPI.Services
{
    /// <summary>
    /// Defines operations for managing microgrid nodes.
    /// </summary>
    public interface IMicrogridNodeService
    {
        // Retrieves all microgrid nodes.
        Task<List<MicrogridNode>> GetAllAsync();

        // Retrieves active nodes only.
        Task<List<MicrogridNode>> GetActiveAsync();

        // Retrieves a node by ID.
        Task<MicrogridNode?> GetByIdAsync(string id);

        // Creates a new microgrid node.
        Task<MicrogridNode> CreateAsync(MicrogridNode node);

        // Updates an existing node.
        Task<bool> UpdateAsync(string id, MicrogridNode node);

        // Deactivates a node (blocked if active reservations exist).
        Task<(bool Success, string Message)> DeactivateAsync(string id);
    }
}
