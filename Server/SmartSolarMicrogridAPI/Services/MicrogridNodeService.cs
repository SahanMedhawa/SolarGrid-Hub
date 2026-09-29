// ============================================================
// File: MicrogridNodeService.cs
// Project: SmartSolarMicrogridAPI
// Description: Implements microgrid node management with
//              deactivation guard against active reservations.
// ============================================================

using MongoDB.Driver;
using System.Globalization;
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
            ValidateSchedule(node.Schedule);

            if (node.CapacityKWh <= 0 || node.BatterySlotCapacities.Count == 0 || node.BatterySlotCapacities.Any(capacity => capacity <= 0))
                throw new ArgumentException("Enter a positive capacity for at least one battery slot.");

            var allocatedCapacity = node.BatterySlotCapacities.Sum();
            if (allocatedCapacity > node.CapacityKWh)
                throw new ArgumentException($"Battery slots total {allocatedCapacity:0.##} kWh, exceeding the grid capacity of {node.CapacityKWh:0.##} kWh.");

            node.BatterySlots = node.BatterySlotCapacities.Count;
            node.AvailableBatterySlots = node.BatterySlots;
            node.CreatedAt = DateTime.UtcNow;
            node.UpdatedAt = DateTime.UtcNow;
            await _context.MicrogridNodes.InsertOneAsync(node);

            var slots = node.BatterySlotCapacities.Select((capacity, index) => new EnergySlot
            {
                NodeId = node.Id!,
                SlotNumber = index + 1,
                AvailableKWh = capacity,
                Status = "Available"
            }).ToList();
            await _context.EnergySlots.InsertManyAsync(slots);

            return node;
        }

        // Updates node properties safely without overwriting non-supplied values with null.
        public async Task<bool> UpdateAsync(string id, MicrogridNode node)
        {
            var existing = await GetByIdAsync(id);
            if (existing == null) return false;

            var updatedCapacity = node.CapacityKWh > 0 ? node.CapacityKWh : existing.CapacityKWh;
            ValidateSchedule(!string.IsNullOrWhiteSpace(node.Schedule) ? node.Schedule : existing.Schedule);

            var configuredSlots = await _context.EnergySlots.Find(s => s.NodeId == id).ToListAsync();
            if (configuredSlots.Sum(s => s.AvailableKWh) > updatedCapacity)
                throw new ArgumentException("Grid capacity cannot be reduced below the total configured battery slot capacity.");

            var update = Builders<MicrogridNode>.Update
                .Set(n => n.NodeName, !string.IsNullOrWhiteSpace(node.NodeName) ? node.NodeName : existing.NodeName)
                .Set(n => n.Location, !string.IsNullOrWhiteSpace(node.Location) ? node.Location : existing.Location)
                .Set(n => n.Latitude, node.Latitude != 0 ? node.Latitude : existing.Latitude)
                .Set(n => n.Longitude, node.Longitude != 0 ? node.Longitude : existing.Longitude)
                .Set(n => n.CapacityKWh, node.CapacityKWh > 0 ? node.CapacityKWh : existing.CapacityKWh)
                .Set(n => n.BatterySlots, node.BatterySlots > 0 ? node.BatterySlots : existing.BatterySlots)
                .Set(n => n.Schedule, !string.IsNullOrWhiteSpace(node.Schedule) ? node.Schedule : existing.Schedule)
                .Set(n => n.UpdatedAt, DateTime.UtcNow);

            var result = await _context.MicrogridNodes.UpdateOneAsync(
                n => n.Id == id, update);
            return result.ModifiedCount > 0;
        }

        private static void ValidateSchedule(string? schedule)
        {
            var times = schedule?.Split('-', StringSplitOptions.TrimEntries);
            if (times == null || times.Length != 2 ||
                !TimeOnly.TryParseExact(times[0], "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out var startTime) ||
                !TimeOnly.TryParseExact(times[1], "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out var endTime) ||
                endTime <= startTime)
            {
                throw new ArgumentException("Schedule must use valid times, and finish time must be later than start time.");
            }
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

        // Deactivates a node only if it has no active reservations.
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
