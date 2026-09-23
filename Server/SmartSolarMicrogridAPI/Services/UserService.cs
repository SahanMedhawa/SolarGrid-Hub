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

        // Constructor — injects MongoDB context.
        public UserService(MongoDbContext context)
        {
            _context = context;
        }

        // Returns all users from the database.
        public async Task<List<User>> GetAllAsync()
        {
            return await _context.Users.Find(_ => true).ToListAsync();
        }

        // Finds a single user by their MongoDB ObjectId.
        public async Task<User?> GetByIdAsync(string id)
        {
            return await _context.Users.Find(u => u.Id == id).FirstOrDefaultAsync();
        }

        // Creates a new user, hashing the password before storage.
        public async Task<User> CreateAsync(User user, string password)
        {
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(password);
            user.CreatedAt = DateTime.UtcNow;
            user.UpdatedAt = DateTime.UtcNow;
            await _context.Users.InsertOneAsync(user);
            return user;
        }

        // Updates user fields by ID.
        public async Task<bool> UpdateAsync(string id, User user)
        {
            var update = Builders<User>.Update
                .Set(u => u.Username, user.Username)
                .Set(u => u.Email, user.Email)
                .Set(u => u.Role, user.Role)
                .Set(u => u.UpdatedAt, DateTime.UtcNow);

            var result = await _context.Users.UpdateOneAsync(
                u => u.Id == id, update);
            return result.ModifiedCount > 0;
        }

        // Marks a user as inactive (soft delete).
        public async Task<bool> DeactivateAsync(string id)
        {
            var update = Builders<User>.Update
                .Set(u => u.IsActive, false)
                .Set(u => u.UpdatedAt, DateTime.UtcNow);

            var result = await _context.Users.UpdateOneAsync(
                u => u.Id == id, update);
            return result.ModifiedCount > 0;
        }
    }
}
