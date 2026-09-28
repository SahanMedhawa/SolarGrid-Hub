// ============================================================
// File: ProsumerService.cs
// Project: SmartSolarMicrogridAPI
// Description: Implements prosumer management business logic
//              including registration, activation, deactivation.
// ============================================================

using MongoDB.Driver;
using SmartSolarMicrogridAPI.Data;
using SmartSolarMicrogridAPI.Models;
using SmartSolarMicrogridAPI.Models.DTOs;

namespace SmartSolarMicrogridAPI.Services
{
    /// <summary>
    /// Handles prosumer profile lifecycle operations.
    /// </summary>
    public class ProsumerService : IProsumerService
    {
        private readonly MongoDbContext _context;

        // Constructor — injects MongoDB context.
        public ProsumerService(MongoDbContext context)
        {
            _context = context;
        }

        // Returns all prosumer profiles.
        public async Task<List<Prosumer>> GetAllAsync()
        {
            return await _context.Prosumers.Find(_ => true).ToListAsync();
        }

        // Finds a prosumer by their NIC.
        public async Task<Prosumer?> GetByNicAsync(string nic)
        {
            return await _context.Prosumers.Find(p => p.NIC == nic).FirstOrDefaultAsync();
        }

        // Returns prosumers filtered by status.
        public async Task<List<Prosumer>> GetByStatusAsync(string status)
        {
            return await _context.Prosumers.Find(p => p.Status == status).ToListAsync();
        }

        // Registers a new prosumer with hashed password, initially set to "Pending".
        public async Task<Prosumer> RegisterAsync(ProsumerRegistrationRequest request)
        {
            var prosumer = new Prosumer
            {
                NIC = request.NIC,
                FirstName = request.FirstName,
                LastName = request.LastName,
                Email = request.Email,
                Phone = request.Phone,
                Address = request.Address,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                Status = "Pending",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _context.Prosumers.InsertOneAsync(prosumer);
            return prosumer;
        }

        // Updates editable fields of a prosumer profile.
        // Updates editable fields of a prosumer profile.
public async Task<bool> UpdateAsync(string nic, ProsumerUpdateRequest request)
{
    var update = Builders<Prosumer>.Update
        .Set(p => p.FirstName, request.FirstName)
        .Set(p => p.LastName, request.LastName)
        .Set(p => p.Email, request.Email)
        .Set(p => p.Phone, request.Phone)
        .Set(p => p.Address, request.Address)
        .Set(p => p.UpdatedAt, DateTime.UtcNow);

    var result = await _context.Prosumers.UpdateOneAsync(
        p => p.NIC == nic, update);

    return result.ModifiedCount > 0;
}
        // Sets prosumer status to "Deactivated".
        public async Task<bool> DeactivateAsync(string nic)
        {
            var update = Builders<Prosumer>.Update
                .Set(p => p.Status, "Deactivated")
                .Set(p => p.UpdatedAt, DateTime.UtcNow);

            var result = await _context.Prosumers.UpdateOneAsync(
                p => p.NIC == nic, update);
            return result.ModifiedCount > 0;
        }

        // Reactivates a deactivated prosumer account.
        public async Task<bool> ActivateAsync(string nic)
        {
            var update = Builders<Prosumer>.Update
                .Set(p => p.Status, "Active")
                .Set(p => p.UpdatedAt, DateTime.UtcNow);

            var result = await _context.Prosumers.UpdateOneAsync(
                p => p.NIC == nic, update);
            return result.ModifiedCount > 0;
        }
    }
}
