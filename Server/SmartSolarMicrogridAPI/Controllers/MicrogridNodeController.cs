// ============================================================
// File: MicrogridNodeController.cs
// Project: SmartSolarMicrogridAPI
// Description: Handles CRUD endpoints for microgrid node
//              (solar grid hub) management.
// ============================================================

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartSolarMicrogridAPI.Models;
using SmartSolarMicrogridAPI.Services;

namespace SmartSolarMicrogridAPI.Controllers
{
    /// <summary>
    /// Microgrid node management API endpoints.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class MicrogridNodeController : ControllerBase
    {
        private readonly IMicrogridNodeService _nodeService;

        // Constructor — injects microgrid node service.
        public MicrogridNodeController(IMicrogridNodeService nodeService)
        {
            _nodeService = nodeService;
        }

        // GET api/microgridnode — Returns all nodes.
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var nodes = await _nodeService.GetAllAsync();
            return Ok(nodes);
        }

        // GET api/microgridnode/active — Returns active nodes only.
        [HttpGet("active")]
        public async Task<IActionResult> GetActive()
        {
            var nodes = await _nodeService.GetActiveAsync();
            return Ok(nodes);
        }

        // GET api/microgridnode/{id} — Returns a specific node.
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            var node = await _nodeService.GetByIdAsync(id);
            if (node == null)
                return NotFound(new { message = "Node not found." });
            return Ok(node);
        }

        // POST api/microgridnode — Creates a new node (Backoffice only).
        [HttpPost]
        [Authorize(Roles = "Backoffice")]
        public async Task<IActionResult> Create([FromBody] MicrogridNode node)
        {
            try
            {
                var created = await _nodeService.CreateAsync(node);
                return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // PUT api/microgridnode/{id} — Updates a node.
        [HttpPut("{id}")]
        [Authorize(Roles = "Backoffice,GridOperator")]
        public async Task<IActionResult> Update(string id, [FromBody] MicrogridNode node)
        {
            try
            {
                var success = await _nodeService.UpdateAsync(id, node);
                if (!success)
                    return NotFound(new { message = "Node not found." });
                return Ok(new { message = "Node updated successfully." });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // PATCH api/microgridnode/{id}/battery-slots — Updates available battery slots directly.
        [HttpPatch("{id}/battery-slots")]
        [Authorize(Roles = "Backoffice,GridOperator")]
        public async Task<IActionResult> UpdateBatterySlots(string id, [FromBody] UpdateBatterySlotsRequest request)
        {
            try
            {
                var success = await _nodeService.UpdateBatterySlotsAsync(id, request.AvailableBatterySlots);
                if (!success)
                    return NotFound(new { message = "Node not found." });
                return Ok(new { message = "Battery slot availability updated successfully." });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // DELETE api/microgridnode/{id} — Deactivates a node (Backoffice only).
        [HttpDelete("{id}")]
        [Authorize(Roles = "Backoffice")]
        public async Task<IActionResult> Deactivate(string id)
        {
            var (success, message) = await _nodeService.DeactivateAsync(id);
            if (!success)
                return BadRequest(new { message });
            return Ok(new { message });
        }

        // PUT api/microgridnode/{id}/activate — Reactivates a node (Backoffice only).
        [HttpPut("{id}/activate")]
        [Authorize(Roles = "Backoffice")]
        public async Task<IActionResult> Activate(string id)
        {
            var success = await _nodeService.ActivateAsync(id);
            if (!success)
                return NotFound(new { message = "Node not found." });
            return Ok(new { message = "Node reactivated successfully." });
        }
    }

    /// <summary>
    /// Request DTO for updating battery slot availability.
    /// </summary>
    public class UpdateBatterySlotsRequest
    {
        public int AvailableBatterySlots { get; set; }
    }
}
