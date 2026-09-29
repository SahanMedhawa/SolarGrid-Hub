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

        // Updates node properties safely without overwriting non-supplied values with null.
        public async Task<bool> UpdateAsync(string id, MicrogridNode node)
        {
            var existing = await GetByIdAsync(id);
            if (existing == null) return false;

            var update = Builders<MicrogridNode>.Update
                .Set(n => n.NodeName, !string.IsNullOrWhiteSpace(node.NodeName) ? node.NodeName : existing.NodeName)
                .Set(n => n.Location, !string.IsNullOrWhiteSpace(node.Location) ? node.Location : existing.Location)
                .Set(n => n.Latitude, node.Latitude != 0 ? node.Latitude : existing.Latitude)
                .Set(n => n.Longitude, node.Longitude != 0 ? node.Longitude : existing.Longitude)
                .Set(n => n.CapacityKWh, node.CapacityKWh > 0 ? node.CapacityKWh : existing.CapacityKWh)
                .Set(n => n.BatterySlots, node.BatterySlots > 0 ? node.BatterySlots : existing.BatterySlots)
                .Set(n => n.AvailableBatterySlots, node.AvailableBatterySlots >= 0 ? node.AvailableBatterySlots : existing.AvailableBatterySlots)
                .Set(n => n.Schedule, !string.IsNullOrWhiteSpace(node.Schedule) ? node.Schedule : existing.Schedule)
                .Set(n => n.UpdatedAt, DateTime.UtcNow);

            var result = await _context.MicrogridNodes.UpdateOneAsync(
                n => n.Id == id, update);
            return result.ModifiedCount > 0;
        }

        // Directly updates available battery slots (Grid Operator / Backoffice responsibility).
        public async Task<bool> UpdateBatterySlotsAsync(string id, int availableSlots)
        {
            var existing = await GetByIdAsync(id);
            if (existing == null) return false;

            if (availableSlots < 0 || availableSlots > existing.BatterySlots)
                throw new ArgumentException($"Available slots must be between 0 and maximum battery capacity ({existing.BatterySlots}).");

            var update = Builders<MicrogridNode>.Update
                .Set(n => n.AvailableBatterySlots, availableSlots)
                .Set(n => n.UpdatedAt, DateTime.UtcNow);

            var result = await _context.MicrogridNodes.UpdateOneAsync(
                n => n.Id == id, update);
            return result.ModifiedCount > 0;
        }

        // Deactivates a node only if no active reservations or slots reference it.
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

            // Check for active energy slots on this node
            var activeSlots = await _context.EnergySlots
                .Find(s => s.NodeId == id &&
                          (s.Status == "Available" || s.Status == "Reserved"))
                .CountDocumentsAsync();

            if (activeSlots > 0)
            {
                return (false, $"Cannot deactivate: {activeSlots} active energy slot(s) exist on this node.");
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

        // Reactivates a deactivated node.
        public async Task<bool> ActivateAsync(string id)
        {
            var update = Builders<MicrogridNode>.Update
                .Set(n => n.IsActive, true)
                .Set(n => n.UpdatedAt, DateTime.UtcNow);

            var result = await _context.MicrogridNodes.UpdateOneAsync(
                n => n.Id == id, update);
            return result.ModifiedCount > 0;
        }
    }
}
