// ============================================================
// File: UserService.cs
// Project: SmartSolarMicrogridAPI
// Description: Implements user management business logic
//              for Backoffice and Grid Operator accounts.
// ============================================================

using MongoDB.Driver;
using SmartSolarMicrogridAPI.Data;
using SmartSolarMicrogridAPI.Models;

namespace SmartSolarMicrogridAPI.Services
{
    /// <summary>
    /// Handles CRUD operations for web application users.
    /// </summary>
    public class UserService : IUserService
    {
        private readonly MongoDbContext _context;
        private static readonly string[] ValidRoles = { "Backoffice", "GridOperator" };

        // Constructor — injects MongoDB context.
        public UserService(MongoDbContext context)
        {
            _context = context;
        }

        // Returns all users from the database.
        public async Task<List<User>> GetAllAsync()
        {
            return await _context.Users.Find(_ => true)
                .SortByDescending(u => u.CreatedAt)
                .ToListAsync();
        }

        // Finds a single user by their MongoDB ObjectId.
        public async Task<User?> GetByIdAsync(string id)
        {
            return await _context.Users.Find(u => u.Id == id).FirstOrDefaultAsync();
        }

        // Finds a user by username — used to check for duplicates before creating.
        public async Task<User?> GetByUsernameAsync(string username)
        {
            return await _context.Users
                .Find(u => u.Username.ToLower() == username.ToLower())
                .FirstOrDefaultAsync();
        }

        // Creates a new user, hashing the password before storage.
        // Validates the role and rejects duplicate usernames.
        public async Task<User> CreateAsync(User user, string password)
        {
            if (!ValidRoles.Contains(user.Role))
                throw new ArgumentException($"Invalid role '{user.Role}'. Must be Backoffice or GridOperator.");

            var existing = await GetByUsernameAsync(user.Username);
            if (existing != null)
                throw new InvalidOperationException("A user with this username already exists.");

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(password);
            user.CreatedAt = DateTime.UtcNow;
            user.UpdatedAt = DateTime.UtcNow;
            user.IsActive = true;

            await _context.Users.InsertOneAsync(user);
            return user;
        }

        // Updates only the safe, editable fields — never password or active status here.
        public async Task<bool> UpdateAsync(string id, string username, string email, string role)
        {
            if (!ValidRoles.Contains(role))
                throw new ArgumentException($"Invalid role '{role}'. Must be Backoffice or GridOperator.");

            var update = Builders<User>.Update
                .Set(u => u.Username, username)
                .Set(u => u.Email, email)
                .Set(u => u.Role, role)
                .Set(u => u.UpdatedAt, DateTime.UtcNow);

            var result = await _context.Users.UpdateOneAsync(u => u.Id == id, update);
            return result.ModifiedCount > 0;
        }

        // Marks a user as inactive (soft delete).
        // Blocked if this would leave zero active Backoffice users.
        public async Task<bool> DeactivateAsync(string id)
        {
            var user = await GetByIdAsync(id);
            if (user == null)
                return false;

            if (user.Role == "Backoffice")
            {
                var activeBackofficeCount = await CountActiveBackofficeAsync();
                if (activeBackofficeCount <= 1)
                    throw new InvalidOperationException("Cannot deactivate the last active Backoffice user.");
            }

            var update = Builders<User>.Update
                .Set(u => u.IsActive, false)
                .Set(u => u.UpdatedAt, DateTime.UtcNow);

            var result = await _context.Users.UpdateOneAsync(u => u.Id == id, update);
            return result.ModifiedCount > 0;
        }

        // Reactivates a previously deactivated user — Backoffice only, enforced at controller level.
        public async Task<bool> ActivateAsync(string id)
        {
            var update = Builders<User>.Update
                .Set(u => u.IsActive, true)
                .Set(u => u.UpdatedAt, DateTime.UtcNow);

            var result = await _context.Users.UpdateOneAsync(u => u.Id == id, update);
            return result.ModifiedCount > 0;
        }

        // Changes a user's own password after verifying their current one.
        public async Task<bool> ChangePasswordAsync(string id, string currentPassword, string newPassword)
        {
            var user = await GetByIdAsync(id);
            if (user == null)
                return false;

            if (!BCrypt.Net.BCrypt.Verify(currentPassword, user.PasswordHash))
                throw new UnauthorizedAccessException("Current password is incorrect.");

            var newHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
            var update = Builders<User>.Update
                .Set(u => u.PasswordHash, newHash)
                .Set(u => u.UpdatedAt, DateTime.UtcNow);

            var result = await _context.Users.UpdateOneAsync(u => u.Id == id, update);
            return result.ModifiedCount > 0;
        }

        // Counts currently active Backoffice users — used to protect against total lockout.
        public async Task<long> CountActiveBackofficeAsync()
        {
            return await _context.Users.CountDocumentsAsync(
                u => u.Role == "Backoffice" && u.IsActive);
        }
    }
}