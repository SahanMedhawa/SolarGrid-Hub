// ============================================================
// File: IUserService.cs
// Project: SmartSolarMicrogridAPI
// Description: Interface for web application user management.
// ============================================================

using SmartSolarMicrogridAPI.Models;

namespace SmartSolarMicrogridAPI.Services
{
    /// <summary>
    /// Defines CRUD operations for web application users.
    /// </summary>
    public interface IUserService
    {
        // Retrieves all users.
        Task<List<User>> GetAllAsync();

        // Retrieves a user by ID.
        Task<User?> GetByIdAsync(string id);

        // Creates a new user with hashed password.
        Task<User> CreateAsync(User user, string password);

        // Updates an existing user.
        Task<bool> UpdateAsync(string id, User user);

        // Deactivates a user account.
        Task<bool> DeactivateAsync(string id);
    }
}
