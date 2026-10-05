// ============================================================
// File: AuthController.cs
// Project: SmartSolarMicrogridAPI
// Description: Handles authentication endpoints for login
//              and the simplified forgot-password flow.
// ============================================================

using Microsoft.AspNetCore.Mvc;
using SmartSolarMicrogridAPI.Models.DTOs;
using SmartSolarMicrogridAPI.Services;
using SmartSolarMicrogridAPI.Utils;

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
        private readonly IUserService _userService;
        private readonly IProsumerService _prosumerService;

        // Constructor — injects authentication and account services.
        public AuthController(IAuthService authService, IUserService userService, IProsumerService prosumerService)
        {
            _authService = authService;
            _userService = userService;
            _prosumerService = prosumerService;
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

        // POST api/auth/forgot-password/verify — Step 1: confirm the account exists.
        // No email is sent; this simplified flow verifies identity directly.
        [HttpPost("forgot-password/verify")]
        public async Task<IActionResult> VerifyForgotPassword([FromBody] ForgotPasswordVerifyRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.UsernameOrNic))
                return BadRequest(new { message = "Username or NIC is required." });

            if (request.LoginType.Equals("Prosumer", StringComparison.OrdinalIgnoreCase))
            {
                var prosumer = await _prosumerService.GetByNicAsync(request.UsernameOrNic);
                if (prosumer == null)
                    return NotFound(new { message = "No prosumer account found with that NIC." });

                if (prosumer.Status.Equals("Deactivated", StringComparison.OrdinalIgnoreCase))
                    return BadRequest(new { message = "This account is deactivated. Contact a Backoffice officer." });

                return Ok(new { message = "Account verified.", displayName = $"{prosumer.FirstName} {prosumer.LastName}" });
            }
            else
            {
                var user = await _userService.GetByUsernameAsync(request.UsernameOrNic);
                if (user == null)
                    return NotFound(new { message = "No account found with that username." });

                if (!user.IsActive)
                    return BadRequest(new { message = "This account is deactivated. Contact a Backoffice officer." });

                return Ok(new { message = "Account verified.", displayName = user.Username });
            }
        }

        // POST api/auth/forgot-password/reset — Step 2: set new password directly.
        [HttpPost("forgot-password/reset")]
        public async Task<IActionResult> ResetForgotPassword([FromBody] ForgotPasswordResetRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.UsernameOrNic))
                return BadRequest(new { message = "Username or NIC is required." });

            if (!PasswordValidator.IsValid(request.NewPassword, out var passwordError))
                return BadRequest(new { message = passwordError });

            bool success;
            if (request.LoginType.Equals("Prosumer", StringComparison.OrdinalIgnoreCase))
            {
                success = await _prosumerService.ResetPasswordAsync(request.UsernameOrNic, request.NewPassword);
            }
            else
            {
                success = await _userService.ResetPasswordAsync(request.UsernameOrNic, request.NewPassword);
            }

            if (!success)
                return NotFound(new { message = "Account not found." });

            return Ok(new { message = "Password reset successfully. You can now log in." });
        }
    }
}