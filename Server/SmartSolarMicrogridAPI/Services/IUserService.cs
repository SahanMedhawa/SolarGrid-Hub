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

        Task<User?> GetByUsernameAsync(string username); 

        // Creates a new user with hashed password.
        Task<User> CreateAsync(User user, string password);

        // Updates an existing user.
        Task<bool> UpdateAsync(string id, string username, string email, string role);

        // Deactivates a user account.
        Task<bool> DeactivateAsync(string id);

        // Reactivates a previously deactivated user account.
        Task<bool> ActivateAsync(string id);

        //Change the password
        Task<bool> ChangePasswordAsync(string id, string currentPassword, string newPassword);

        // Counts currently active Backoffice users — used to prevent total lockout.
        Task<long> CountActiveBackofficeAsync();

    }
}
