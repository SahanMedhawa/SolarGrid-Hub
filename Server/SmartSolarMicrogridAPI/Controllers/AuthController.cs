// ============================================================
// File: AuthController.cs
// Project: SmartSolarMicrogridAPI
// Description: Handles authentication endpoints for login.
// ============================================================

using Microsoft.AspNetCore.Mvc;
using SmartSolarMicrogridAPI.Models.DTOs;
using SmartSolarMicrogridAPI.Services;

namespace SmartSolarMicrogridAPI.Controllers
{
    /// <summary>
    /// Authentication API endpoints.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        // Constructor — injects authentication service.
        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        // POST api/auth/login — Authenticates a user or prosumer.
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var result = await _authService.LoginAsync(request);
            if (result == null)
                return Unauthorized(new { message = "Invalid credentials or account inactive." });

            return Ok(result);
        }
    }
}
