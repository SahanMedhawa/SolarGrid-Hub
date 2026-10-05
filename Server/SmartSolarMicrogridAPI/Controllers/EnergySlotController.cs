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

            UpdateDefinition<EnergySlot> update;
            if (request.UnderMaintenance)
            {
                if (string.Equals(existing.Status, "Maintenance", StringComparison.OrdinalIgnoreCase))
                {
                    var scheduledWindow = existing.MaintenanceDate.HasValue &&
                                          !string.IsNullOrWhiteSpace(existing.MaintenanceStartTime) &&
                                          !string.IsNullOrWhiteSpace(existing.MaintenanceEndTime)
                        ? $" for {existing.MaintenanceDate.Value:yyyy-MM-dd} from {existing.MaintenanceStartTime} to {existing.MaintenanceEndTime}"
                        : string.Empty;
                    return Conflict(new { message = $"Slot {existing.SlotNumber} already has maintenance scheduled{scheduledWindow}. Refresh the page to see it." });
                }

                if (!request.MaintenanceDate.HasValue || request.MaintenanceDate.Value.Date < DateTime.Today ||
                    !MaintenanceTimeValidation.TryParseTime(request.StartTime, out var start) || !MaintenanceTimeValidation.TryParseTime(request.EndTime, out var end) || end <= start)
                {
                    return BadRequest(new { message = "Choose a valid maintenance date and a finish time later than the start time." });
                }

                var maintenanceDate = request.MaintenanceDate.Value.Date;
                if (maintenanceDate == DateTime.Today && maintenanceDate.Add(start.ToTimeSpan()) <= DateTime.Now)
                    return BadRequest(new { message = "Maintenance must start in the future." });

                var activeReservations = await _context.Reservations.Find(r =>
                    r.AllocatedSlotIds.Contains(id) &&
                    r.ReservationDate >= maintenanceDate && r.ReservationDate < maintenanceDate.AddDays(1) &&
                    (r.Status == "Pending" || r.Status == "Approved")).ToListAsync();
                var conflictingReservation = activeReservations.Any(reservation =>
                    MaintenanceTimeValidation.TimesOverlap(reservation.StartTime, reservation.EndTime, request.StartTime!, request.EndTime!));
                if (conflictingReservation)
                {
                    return Conflict(new { message = "This slot has an active reservation during the requested maintenance time." });
                }

                update = Builders<EnergySlot>.Update
                    .Set(s => s.Status, "Maintenance")
                    .Set(s => s.MaintenanceDate, DateTime.SpecifyKind(maintenanceDate, DateTimeKind.Utc))
                    .Set(s => s.MaintenanceStartTime, request.StartTime)
                    .Set(s => s.MaintenanceEndTime, request.EndTime);
            }
            else
            {
                update = Builders<EnergySlot>.Update
                    .Set(s => s.Status, "Available")
                    .Unset(s => s.MaintenanceDate)
                    .Unset(s => s.MaintenanceStartTime)
                    .Unset(s => s.MaintenanceEndTime);
            }

            var updateFilter = request.UnderMaintenance
                ? Builders<EnergySlot>.Filter.Eq(s => s.Id, id) &
                  Builders<EnergySlot>.Filter.Ne(s => s.Status, "Maintenance")
                : Builders<EnergySlot>.Filter.Eq(s => s.Id, id);
            var result = await _context.EnergySlots.UpdateOneAsync(updateFilter, update);

            if (result.ModifiedCount == 0)
            {
                var latest = await _context.EnergySlots.Find(s => s.Id == id).FirstOrDefaultAsync();
                if (request.UnderMaintenance && latest != null &&
                    string.Equals(latest.Status, "Maintenance", StringComparison.OrdinalIgnoreCase))
                {
                    var window = latest.MaintenanceDate.HasValue &&
                                 !string.IsNullOrWhiteSpace(latest.MaintenanceStartTime) &&
                                 !string.IsNullOrWhiteSpace(latest.MaintenanceEndTime)
                        ? $" for {latest.MaintenanceDate.Value:yyyy-MM-dd} from {latest.MaintenanceStartTime} to {latest.MaintenanceEndTime}"
                        : string.Empty;
                    return Conflict(new { message = $"Slot {latest.SlotNumber} already has maintenance scheduled{window}. Refresh the page to see it." });
                }
                return NotFound(new { message = "Slot not found." });
            }

            // Sync node capacity after maintenance status change
            await _nodeService.SyncNodeCapacityAsync(existing.NodeId);

            var msg = request.UnderMaintenance
                ? $"Slot {existing.SlotNumber} scheduled for maintenance on {request.MaintenanceDate:yyyy-MM-dd} from {request.StartTime} to {request.EndTime}."
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
        public DateTime? MaintenanceDate { get; set; }
        public string? StartTime { get; set; }
        public string? EndTime { get; set; }
    }

    public static class MaintenanceTimeValidation
    {
        public static bool TryParseTime(string? value, out TimeOnly time)
        {
            if (string.Equals(value?.Trim(), "24:00", StringComparison.Ordinal))
            {
                time = new TimeOnly(23, 59);
                return true;
            }
            return TimeOnly.TryParseExact(value, "HH:mm", System.Globalization.CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.None, out time);
        }

        public static bool TimesOverlap(string? startA, string? endA, string startB, string endB)
        {
            return TryParseTime(startA, out var aStart) && TryParseTime(endA, out var aEnd) &&
                   TryParseTime(startB, out var bStart) && TryParseTime(endB, out var bEnd) &&
                   aStart < bEnd && bStart < aEnd;
        }
    }
}
