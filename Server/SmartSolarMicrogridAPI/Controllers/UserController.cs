// ============================================================
// File: UserController.cs
// Project: SmartSolarMicrogridAPI
// Description: Handles CRUD endpoints for web application users
//              (Backoffice and Grid Operator roles).
// ============================================================

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartSolarMicrogridAPI.Models;
using SmartSolarMicrogridAPI.Services;

namespace SmartSolarMicrogridAPI.Controllers
{
    /// <summary>
    /// User management API endpoints. Backoffice-only access.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Backoffice")]
    public class UserController : ControllerBase
    {
        private readonly IUserService _userService;

        public UserController(IUserService userService)
        {
            _userService = userService;
        }

        // GET api/user — Returns all users.
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var users = await _userService.GetAllAsync();
            return Ok(users);
        }

        // GET api/user/{id} — Returns a specific user.
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            var user = await _userService.GetByIdAsync(id);
            if (user == null)
                return NotFound(new { message = "User not found." });
            return Ok(user);
        }

        // POST api/user — Creates a new user.
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateUserRequest request)
        {
            try
            {
                var user = new User
                {
                    Username = request.Username,
                    Email = request.Email,
                    Role = request.Role
                };

                var created = await _userService.CreateAsync(user, request.Password);
                return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // PUT api/user/{id} — Updates a user's editable fields only.
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(string id, [FromBody] UpdateUserRequest request)
        {
            try
            {
                var success = await _userService.UpdateAsync(id, request.Username, request.Email, request.Role);
                if (!success)
                    return NotFound(new { message = "User not found." });
                return Ok(new { message = "User updated successfully." });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // DELETE api/user/{id} — Deactivates a user. Blocked if it's the last active Backoffice account.
        [HttpDelete("{id}")]
        public async Task<IActionResult> Deactivate(string id)
        {
            try
            {
                var success = await _userService.DeactivateAsync(id);
                if (!success)
                    return NotFound(new { message = "User not found." });
                return Ok(new { message = "User deactivated successfully." });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // PATCH api/user/{id}/activate — Reactivates a previously deactivated user.
        [HttpPatch("{id}/activate")]
        public async Task<IActionResult> Activate(string id)
        {
            var success = await _userService.ActivateAsync(id);
            if (!success)
                return NotFound(new { message = "User not found." });
            return Ok(new { message = "User activated successfully." });
        }
    }

    public class CreateUserRequest
    {
        public string Username { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string Password { get; set; } = null!;
        public string Role { get; set; } = null!;
    }

    public class UpdateUserRequest
    {
        public string Username { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string Role { get; set; } = null!;
    }
}