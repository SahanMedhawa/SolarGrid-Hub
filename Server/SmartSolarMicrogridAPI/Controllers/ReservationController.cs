// ============================================================
// File: ReservationController.cs
// Project: SmartSolarMicrogridAPI
// Description: Handles endpoints for energy reservation
//              management including booking, updates, and QR.
// ============================================================

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartSolarMicrogridAPI.Models.DTOs;
using SmartSolarMicrogridAPI.Services;

namespace SmartSolarMicrogridAPI.Controllers
{
    /// <summary>
    /// Reservation management API endpoints.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ReservationController : ControllerBase
    {
        private readonly IReservationService _reservationService;

        // Constructor — injects reservation service.
        public ReservationController(IReservationService reservationService)
        {
            _reservationService = reservationService;
        }

        // GET api/reservation — Returns all reservations.
        [HttpGet]
        [Authorize(Roles = "Backoffice,GridOperator")]
        public async Task<IActionResult> GetAll()
        {
            var reservations = await _reservationService.GetAllAsync();
            return Ok(reservations);
        }

        // GET api/reservation/{id} — Returns a specific reservation.
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            var reservation = await _reservationService.GetByIdAsync(id);
            if (reservation == null)
                return NotFound(new { message = "Reservation not found." });
            return Ok(reservation);
        }

        // GET api/reservation/prosumer/{nic} — Returns reservations for a prosumer.
        [HttpGet("prosumer/{nic}")]
        public async Task<IActionResult> GetByProsumer(string nic)
        {
            var reservations = await _reservationService.GetByProsumerNicAsync(nic);
            return Ok(reservations);
        }

        // GET api/reservation/status/{status} — Returns reservations by status.
        [HttpGet("status/{status}")]
        [Authorize(Roles = "Backoffice,GridOperator")]
        public async Task<IActionResult> GetByStatus(string status)
        {
            var reservations = await _reservationService.GetByStatusAsync(status);
            return Ok(reservations);
        }

        // GET api/reservation/prosumer/{nic}/future-count — Returns count of approved future reservations.
        [HttpGet("prosumer/{nic}/future-count")]
        public async Task<IActionResult> GetFutureCount(string nic)
        {
            var count = await _reservationService.GetApprovedFutureCountAsync(nic);
            return Ok(new { count });
        }

        // POST api/reservation — Creates a new reservation.
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateReservationRequest request)
        {
            var (success, message, reservation) = await _reservationService.CreateAsync(request);
            if (!success)
                return BadRequest(new { message });
            return CreatedAtAction(nameof(GetById), new { id = reservation!.Id }, reservation);
        }

        // PUT api/reservation/{id} — Updates a reservation.
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(string id, [FromBody] UpdateReservationRequest request)
        {
            var (success, message) = await _reservationService.UpdateAsync(id, request);
            if (!success)
                return BadRequest(new { message });
            return Ok(new { message });
        }

        // PUT api/reservation/{id}/cancel — Cancels a reservation.
        [HttpPut("{id}/cancel")]
        public async Task<IActionResult> Cancel(string id)
        {
            var (success, message) = await _reservationService.CancelAsync(id);
            if (!success)
                return BadRequest(new { message });
            return Ok(new { message });
        }

        // PUT api/reservation/{id}/approve — Approves a reservation.
        [HttpPut("{id}/approve")]
        [Authorize(Roles = "Backoffice,GridOperator")]
        public async Task<IActionResult> Approve(string id)
        {
            var (success, message) = await _reservationService.ApproveAsync(id);
            if (!success)
                return BadRequest(new { message });
            return Ok(new { message });
        }

        // PUT api/reservation/{id}/complete — Completes a reservation via QR verification.
        [HttpPut("{id}/complete")]
        [Authorize(Roles = "GridOperator")]
        public async Task<IActionResult> Complete(string id, [FromBody] CompleteRequest request)
        {
            var (success, message) = await _reservationService.CompleteAsync(id, request.QrData);
            if (!success)
                return BadRequest(new { message });
            return Ok(new { message });
        }
    }

    /// <summary>
    /// DTO for completing a reservation with QR data.
    /// </summary>
    public class CompleteRequest
    {
        public string QrData { get; set; } = null!;
    }
}
