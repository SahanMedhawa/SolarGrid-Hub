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
        [Authorize(Roles = "Backoffice,GridOperator")]
        public async Task<IActionResult> Create([FromBody] EnergySlot slot)
        {
            slot.CreatedAt = DateTime.UtcNow;
            await _context.EnergySlots.InsertOneAsync(slot);
            return CreatedAtAction(nameof(GetById), new { id = slot.Id }, slot);
        }

        // PUT api/energyslot/{id} — Updates a slot.
        [HttpPut("{id}")]
        [Authorize(Roles = "Backoffice,GridOperator")]
        public async Task<IActionResult> Update(string id, [FromBody] EnergySlot slot)
        {
            var update = Builders<EnergySlot>.Update
                .Set(s => s.SlotDate, slot.SlotDate)
                .Set(s => s.StartTime, slot.StartTime)
                .Set(s => s.EndTime, slot.EndTime)
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
            var result = await _context.EnergySlots.DeleteOneAsync(s => s.Id == id);
            if (result.DeletedCount == 0)
                return NotFound(new { message = "Slot not found." });
            return Ok(new { message = "Slot deleted successfully." });
        }
    }
}
