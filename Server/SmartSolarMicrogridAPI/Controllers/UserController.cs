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
    /// User management API endpoints.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Backoffice")]
    public class UserController : ControllerBase
    {
        private readonly IUserService _userService;

        // Constructor — injects user service.
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
            var user = new User
            {
                Username = request.Username,
                Email = request.Email,
                Role = request.Role
            };

            var created = await _userService.CreateAsync(user, request.Password);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }

        // PUT api/user/{id} — Updates a user.
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(string id, [FromBody] User user)
        {
            var success = await _userService.UpdateAsync(id, user);
            if (!success)
                return NotFound(new { message = "User not found." });
            return Ok(new { message = "User updated successfully." });
        }

        // DELETE api/user/{id} — Deactivates a user.
        [HttpDelete("{id}")]
        public async Task<IActionResult> Deactivate(string id)
        {
            var success = await _userService.DeactivateAsync(id);
            if (!success)
                return NotFound(new { message = "User not found." });
            return Ok(new { message = "User deactivated successfully." });
        }
    }

    /// <summary>
    /// DTO for creating a new web application user.
    /// </summary>
    public class CreateUserRequest
    {
        public string Username { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string Password { get; set; } = null!;
        public string Role { get; set; } = null!;
    }
}
