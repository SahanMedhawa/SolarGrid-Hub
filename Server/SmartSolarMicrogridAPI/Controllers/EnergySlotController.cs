// ============================================================
// File: EnergySlotController.cs
// Project: SmartSolarMicrogridAPI
// Description: Handles CRUD endpoints for energy slot
//              management within microgrid nodes.
// ============================================================

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using SmartSolarMicrogridAPI.Data;
using SmartSolarMicrogridAPI.Models;
using SmartSolarMicrogridAPI.Models.DTOs;

namespace SmartSolarMicrogridAPI.Controllers
{
    /// <summary>
    /// Energy slot management API endpoints.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class EnergySlotController : ControllerBase
    {
        private readonly MongoDbContext _context;

        // Constructor — injects MongoDB context.
        public EnergySlotController(MongoDbContext context)
        {
            _context = context;
        }

        // GET api/energyslot/node/{nodeId} — Returns all slots for a node.
        [HttpGet("node/{nodeId}")]
        public async Task<IActionResult> GetByNode(string nodeId)
        {
            var slots = await _context.EnergySlots
                .Find(s => s.NodeId == nodeId)
                .ToListAsync();
            return Ok(slots);
        }

        // GET api/energyslot/node/{nodeId}/available — Returns available slots for a node.
        [HttpGet("node/{nodeId}/available")]
        public async Task<IActionResult> GetAvailableByNode(string nodeId)
        {
            var slots = await _context.EnergySlots
                .Find(s => s.NodeId == nodeId && s.Status == "Available")
                .ToListAsync();
            return Ok(slots);
        }

        // GET api/energyslot/{id} — Returns a specific slot.
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            var slot = await _context.EnergySlots
                .Find(s => s.Id == id)
                .FirstOrDefaultAsync();
            if (slot == null)
                return NotFound(new { message = "Slot not found." });
            return Ok(slot);
        }

        // POST api/energyslot — Creates a new energy slot.
        [HttpPost]
        [Authorize(Roles = "Backoffice")]
        public async Task<IActionResult> Create([FromBody] CreateEnergySlotRequest request)
        {
            var node = await _context.MicrogridNodes
                .Find(n => n.Id == request.NodeId)
                .FirstOrDefaultAsync();

            if (node == null)
                return NotFound(new { message = "Microgrid node not found." });

            if (!node.IsActive)
                return BadRequest(new { message = "Cannot add slots to an inactive microgrid node." });

            if (request.AvailableKWh <= 0)
                return BadRequest(new { message = "Battery slot capacity must be greater than 0 kWh." });

            var existingSlots = await _context.EnergySlots.Find(s => s.NodeId == request.NodeId).ToListAsync();
            if (existingSlots.Sum(s => s.AvailableKWh) + request.AvailableKWh > node.CapacityKWh)
                return BadRequest(new { message = $"Battery slot capacity exceeds the remaining grid capacity ({node.CapacityKWh - existingSlots.Sum(s => s.AvailableKWh):0.##} kWh)." });

            var slot = new EnergySlot
            {
                NodeId = request.NodeId,
                AvailableKWh = request.AvailableKWh,
                Status = "Available"
            };
            slot.CreatedAt = DateTime.UtcNow;
            slot.SlotNumber = existingSlots.Count == 0 ? 1 : existingSlots.Max(s => s.SlotNumber) + 1;
            await _context.EnergySlots.InsertOneAsync(slot);

            await _context.MicrogridNodes.UpdateOneAsync(
                n => n.Id == request.NodeId,
                Builders<MicrogridNode>.Update
                    .Inc(n => n.BatterySlots, 1)
                    .Inc(n => n.AvailableBatterySlots, 1));

            return CreatedAtAction(nameof(GetById), new { id = slot.Id }, slot);
        }

        // PUT api/energyslot/{id} — Updates a slot.
        [HttpPut("{id}")]
        [Authorize(Roles = "Backoffice,GridOperator")]
        public async Task<IActionResult> Update(string id, [FromBody] EnergySlot slot)
        {
            var existing = await _context.EnergySlots.Find(s => s.Id == id).FirstOrDefaultAsync();
            if (existing == null)
                return NotFound(new { message = "Slot not found." });

            if (slot.AvailableKWh <= 0)
                return BadRequest(new { message = "Battery slot capacity must be greater than 0 kWh." });

            var node = await _context.MicrogridNodes.Find(n => n.Id == existing.NodeId).FirstOrDefaultAsync();
            var otherSlots = await _context.EnergySlots.Find(s => s.NodeId == existing.NodeId && s.Id != id).ToListAsync();
            if (node != null && otherSlots.Sum(s => s.AvailableKWh) + slot.AvailableKWh > node.CapacityKWh)
                return BadRequest(new { message = "Battery slot capacities cannot exceed the grid capacity." });

            var update = Builders<EnergySlot>.Update
                .Set(s => s.AvailableKWh, slot.AvailableKWh)
                .Set(s => s.Status, slot.Status);

            var result = await _context.EnergySlots.UpdateOneAsync(
                s => s.Id == id, update);

            if (result.ModifiedCount == 0)
                return NotFound(new { message = "Slot not found." });
            return Ok(new { message = "Slot updated successfully." });
        }

        // DELETE api/energyslot/{id} — Deletes a slot.
        [HttpDelete("{id}")]
        [Authorize(Roles = "Backoffice")]
        public async Task<IActionResult> Delete(string id)
        {
            var slot = await _context.EnergySlots.Find(s => s.Id == id).FirstOrDefaultAsync();
            if (slot == null)
                return NotFound(new { message = "Slot not found." });

            var hasActiveReservation = await _context.Reservations.CountDocumentsAsync(
                r => r.SlotId == id && (r.Status == "Pending" || r.Status == "Approved"));
            if (hasActiveReservation > 0)
                return BadRequest(new { message = "Cannot delete a battery slot with an active reservation." });

            var result = await _context.EnergySlots.DeleteOneAsync(s => s.Id == id);
            if (result.DeletedCount == 0)
                return NotFound(new { message = "Slot not found." });

            var nodeUpdate = Builders<MicrogridNode>.Update.Inc(n => n.BatterySlots, -1);
            if (string.Equals(slot.Status, "Available", StringComparison.OrdinalIgnoreCase))
                nodeUpdate = Builders<MicrogridNode>.Update.Combine(
                    nodeUpdate,
                    Builders<MicrogridNode>.Update.Inc(n => n.AvailableBatterySlots, -1));
            await _context.MicrogridNodes.UpdateOneAsync(n => n.Id == slot.NodeId, nodeUpdate);

            return Ok(new { message = "Slot deleted successfully." });
        }
    }
}
