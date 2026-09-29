// ============================================================
// File: EnergySlotController.cs
// Project: SmartSolarMicrogridAPI
// Description: Handles CRUD endpoints for battery slot
//              management within microgrid nodes, including
//              maintenance status toggling and capacity sync.
// ============================================================

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using SmartSolarMicrogridAPI.Data;
using SmartSolarMicrogridAPI.Models;
using SmartSolarMicrogridAPI.Models.DTOs;
using SmartSolarMicrogridAPI.Services;

namespace SmartSolarMicrogridAPI.Controllers
{
    /// <summary>
    /// Battery slot management API endpoints.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class EnergySlotController : ControllerBase
    {
        private readonly MongoDbContext _context;
        private readonly IMicrogridNodeService _nodeService;

        // Constructor — injects MongoDB context and node service.
        public EnergySlotController(MongoDbContext context, IMicrogridNodeService nodeService)
        {
            _context = context;
            _nodeService = nodeService;
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

        // GET api/energyslot/node/{nodeId}/available — Returns available (non-maintenance) slots for a node.
        [HttpGet("node/{nodeId}/available")]
        public async Task<IActionResult> GetAvailableByNode(string nodeId)
        {
            var slots = await _context.EnergySlots
                .Find(s => s.NodeId == nodeId && s.Status != "Maintenance")
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

        // POST api/energyslot — Creates a new battery slot and syncs node capacity.
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

            var slot = new EnergySlot
            {
                NodeId = request.NodeId,
                AvailableKWh = request.AvailableKWh,
                Status = "Available"
            };
            slot.CreatedAt = DateTime.UtcNow;
            slot.SlotNumber = existingSlots.Count == 0 ? 1 : existingSlots.Max(s => s.SlotNumber) + 1;
            await _context.EnergySlots.InsertOneAsync(slot);

            // Sync node capacity and slot counts
            await _nodeService.SyncNodeCapacityAsync(request.NodeId);

            return CreatedAtAction(nameof(GetById), new { id = slot.Id }, slot);
        }

        // PUT api/energyslot/{id} — Updates a slot's capacity and/or status.
        [HttpPut("{id}")]
        [Authorize(Roles = "Backoffice,GridOperator")]
        public async Task<IActionResult> Update(string id, [FromBody] EnergySlot slot)
        {
            var existing = await _context.EnergySlots.Find(s => s.Id == id).FirstOrDefaultAsync();
            if (existing == null)
                return NotFound(new { message = "Slot not found." });

            if (slot.AvailableKWh <= 0)
                return BadRequest(new { message = "Battery slot capacity must be greater than 0 kWh." });

            // Validate status is one of the allowed values
            var validStatuses = new[] { "Available", "Maintenance" };
            var newStatus = validStatuses.FirstOrDefault(s =>
                string.Equals(s, slot.Status, StringComparison.OrdinalIgnoreCase)) ?? existing.Status;

            var update = Builders<EnergySlot>.Update
                .Set(s => s.AvailableKWh, slot.AvailableKWh)
                .Set(s => s.Status, newStatus);

            var result = await _context.EnergySlots.UpdateOneAsync(
                s => s.Id == id, update);

            if (result.ModifiedCount == 0)
                return NotFound(new { message = "Slot not found." });

            // Sync node capacity after changes
            await _nodeService.SyncNodeCapacityAsync(existing.NodeId);

            return Ok(new { message = "Slot updated successfully." });
        }

        // PUT api/energyslot/{id}/maintenance — Toggles maintenance status on a slot.
        [HttpPut("{id}/maintenance")]
        [Authorize(Roles = "Backoffice,GridOperator")]
        public async Task<IActionResult> ToggleMaintenance(string id, [FromBody] MaintenanceRequest request)
        {
            var existing = await _context.EnergySlots.Find(s => s.Id == id).FirstOrDefaultAsync();
            if (existing == null)
                return NotFound(new { message = "Slot not found." });

            var newStatus = request.UnderMaintenance ? "Maintenance" : "Available";

            var update = Builders<EnergySlot>.Update
                .Set(s => s.Status, newStatus);

            var result = await _context.EnergySlots.UpdateOneAsync(
                s => s.Id == id, update);

            if (result.ModifiedCount == 0)
                return NotFound(new { message = "Slot not found." });

            // Sync node capacity after maintenance status change
            await _nodeService.SyncNodeCapacityAsync(existing.NodeId);

            var msg = request.UnderMaintenance
                ? $"Slot {existing.SlotNumber} marked as under maintenance. Its {existing.AvailableKWh} kWh capacity is excluded from availability."
                : $"Slot {existing.SlotNumber} returned to service. Its {existing.AvailableKWh} kWh capacity is now available.";

            return Ok(new { message = msg });
        }

        // DELETE api/energyslot/{id} — Deletes a slot and syncs node capacity.
        [HttpDelete("{id}")]
        [Authorize(Roles = "Backoffice")]
        public async Task<IActionResult> Delete(string id)
        {
            var slot = await _context.EnergySlots.Find(s => s.Id == id).FirstOrDefaultAsync();
            if (slot == null)
                return NotFound(new { message = "Slot not found." });

            // Check if any active reservation has this slot allocated
            var hasActiveReservation = await _context.Reservations.CountDocumentsAsync(
                r => r.AllocatedSlotIds.Contains(id) &&
                     (r.Status == "Pending" || r.Status == "Approved"));
            if (hasActiveReservation > 0)
                return BadRequest(new { message = "Cannot delete a battery slot that is allocated to an active reservation." });

            var result = await _context.EnergySlots.DeleteOneAsync(s => s.Id == id);
            if (result.DeletedCount == 0)
                return NotFound(new { message = "Slot not found." });

            // Sync node capacity after deletion
            await _nodeService.SyncNodeCapacityAsync(slot.NodeId);

            return Ok(new { message = "Slot deleted successfully." });
        }
    }

    /// <summary>
    /// Request DTO for toggling maintenance status on a battery slot.
    /// </summary>
    public class MaintenanceRequest
    {
        public bool UnderMaintenance { get; set; }
    }
}
