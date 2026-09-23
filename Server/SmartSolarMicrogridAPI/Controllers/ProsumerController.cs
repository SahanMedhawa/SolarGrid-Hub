// ============================================================
// File: ProsumerController.cs
// Project: SmartSolarMicrogridAPI
// Description: Handles CRUD endpoints for solar prosumer
//              profile management.
// ============================================================

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartSolarMicrogridAPI.Models;
using SmartSolarMicrogridAPI.Models.DTOs;
using SmartSolarMicrogridAPI.Services;

namespace SmartSolarMicrogridAPI.Controllers
{
    /// <summary>
    /// Prosumer management API endpoints.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class ProsumerController : ControllerBase
    {
        private readonly IProsumerService _prosumerService;

        // Constructor — injects prosumer service.
        public ProsumerController(IProsumerService prosumerService)
        {
            _prosumerService = prosumerService;
        }

        // GET api/prosumer — Returns all prosumers (Backoffice only).
        [HttpGet]
        [Authorize(Roles = "Backoffice,GridOperator")]
        public async Task<IActionResult> GetAll()
        {
            var prosumers = await _prosumerService.GetAllAsync();
            return Ok(prosumers);
        }

        // GET api/prosumer/{nic} — Returns a prosumer by NIC.
        [HttpGet("{nic}")]
        [Authorize]
        public async Task<IActionResult> GetByNic(string nic)
        {
            var prosumer = await _prosumerService.GetByNicAsync(nic);
            if (prosumer == null)
                return NotFound(new { message = "Prosumer not found." });
            return Ok(prosumer);
        }

        // GET api/prosumer/status/{status} — Returns prosumers by status.
        [HttpGet("status/{status}")]
        [Authorize(Roles = "Backoffice")]
        public async Task<IActionResult> GetByStatus(string status)
        {
            var prosumers = await _prosumerService.GetByStatusAsync(status);
            return Ok(prosumers);
        }

        // POST api/prosumer/register — Registers a new prosumer (public).
        [HttpPost("register")]
        [AllowAnonymous]
        public async Task<IActionResult> Register([FromBody] ProsumerRegistrationRequest request)
        {
            // Check if NIC already exists
            var existing = await _prosumerService.GetByNicAsync(request.NIC);
            if (existing != null)
                return Conflict(new { message = "A prosumer with this NIC already exists." });

            var prosumer = await _prosumerService.RegisterAsync(request);
            return CreatedAtAction(nameof(GetByNic), new { nic = prosumer.NIC }, prosumer);
        }

        // PUT api/prosumer/{nic} — Updates prosumer profile.
        [HttpPut("{nic}")]
        [Authorize]
        public async Task<IActionResult> Update(string nic, [FromBody] Prosumer prosumer)
        {
            var success = await _prosumerService.UpdateAsync(nic, prosumer);
            if (!success)
                return NotFound(new { message = "Prosumer not found." });
            return Ok(new { message = "Prosumer updated successfully." });
        }

        // PUT api/prosumer/{nic}/deactivate — Requests deactivation.
        [HttpPut("{nic}/deactivate")]
        [Authorize]
        public async Task<IActionResult> Deactivate(string nic)
        {
            var success = await _prosumerService.DeactivateAsync(nic);
            if (!success)
                return NotFound(new { message = "Prosumer not found." });
            return Ok(new { message = "Prosumer deactivation requested." });
        }

        // PUT api/prosumer/{nic}/activate — Reactivates account (Backoffice only).
        [HttpPut("{nic}/activate")]
        [Authorize(Roles = "Backoffice")]
        public async Task<IActionResult> Activate(string nic)
        {
            var success = await _prosumerService.ActivateAsync(nic);
            if (!success)
                return NotFound(new { message = "Prosumer not found." });
            return Ok(new { message = "Prosumer account activated." });
        }
    }
}
