// ============================================================
// File: MicrogridNodeService.cs
// Project: SmartSolarMicrogridAPI
// Description: Implements microgrid node management with
//              deactivation guard against active reservations.
// ============================================================

using MongoDB.Driver;
using SmartSolarMicrogridAPI.Data;
using SmartSolarMicrogridAPI.Models;

namespace SmartSolarMicrogridAPI.Services
{
    /// <summary>
    /// Handles CRUD for microgrid nodes with business rule enforcement.
    /// </summary>
    public class MicrogridNodeService : IMicrogridNodeService
    {
        private readonly MongoDbContext _context;

        // Constructor — injects MongoDB context.
        public MicrogridNodeService(MongoDbContext context)
        {
            _context = context;
        }

        // Returns all nodes.
        public async Task<List<MicrogridNode>> GetAllAsync()
        {
            return await _context.MicrogridNodes.Find(_ => true).ToListAsync();
        }

        // Returns only active nodes.
        public async Task<List<MicrogridNode>> GetActiveAsync()
        {
            return await _context.MicrogridNodes.Find(n => n.IsActive).ToListAsync();
        }

        // Finds a node by its MongoDB ObjectId.
        public async Task<MicrogridNode?> GetByIdAsync(string id)
        {
            return await _context.MicrogridNodes.Find(n => n.Id == id).FirstOrDefaultAsync();
        }

        // Creates a new microgrid node.
        public async Task<MicrogridNode> CreateAsync(MicrogridNode node)
        {
            node.CreatedAt = DateTime.UtcNow;
            node.UpdatedAt = DateTime.UtcNow;
            node.AvailableBatterySlots = node.BatterySlots;
            await _context.MicrogridNodes.InsertOneAsync(node);
            return node;
        }

        // Updates node properties.
        public async Task<bool> UpdateAsync(string id, MicrogridNode node)
        {
            var update = Builders<MicrogridNode>.Update
                .Set(n => n.NodeName, node.NodeName)
                .Set(n => n.Location, node.Location)
                .Set(n => n.Latitude, node.Latitude)
                .Set(n => n.Longitude, node.Longitude)
                .Set(n => n.CapacityKWh, node.CapacityKWh)
                .Set(n => n.BatterySlots, node.BatterySlots)
                .Set(n => n.AvailableBatterySlots, node.AvailableBatterySlots)
                .Set(n => n.Schedule, node.Schedule)
                .Set(n => n.UpdatedAt, DateTime.UtcNow);

            var result = await _context.MicrogridNodes.UpdateOneAsync(
                n => n.Id == id, update);
            return result.ModifiedCount > 0;
        }

        // Deactivates a node only if no active reservations reference it.
        public async Task<(bool Success, string Message)> DeactivateAsync(string id)
        {
            // Check for active reservations on this node
            var activeReservations = await _context.Reservations
                .Find(r => r.NodeId == id &&
                          (r.Status == "Pending" || r.Status == "Approved"))
                .CountDocumentsAsync();

            if (activeReservations > 0)
            {
                return (false, $"Cannot deactivate: {activeReservations} active reservation(s) exist on this node.");
            }

            var update = Builders<MicrogridNode>.Update
                .Set(n => n.IsActive, false)
                .Set(n => n.UpdatedAt, DateTime.UtcNow);

            var result = await _context.MicrogridNodes.UpdateOneAsync(
                n => n.Id == id, update);

            return result.ModifiedCount > 0
                ? (true, "Node deactivated successfully.")
                : (false, "Node not found.");
        }
    }
}
