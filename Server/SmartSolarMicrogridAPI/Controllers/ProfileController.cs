// ============================================================
// File: ProfileController.cs
// Project: SmartSolarMicrogridAPI
// Description: Self-service endpoints so any logged-in staff
//              user (Backoffice or GridOperator) can view/update
//              their own profile, change their password, or
//              request deactivation of their own account.
// ============================================================

using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartSolarMicrogridAPI.Services;

namespace SmartSolarMicrogridAPI.Controllers
{
    /// <summary>
    /// Self-service profile endpoints. Any authenticated staff user
    /// (Backoffice or GridOperator) may access their own data only —
    /// the target user is always derived from the JWT, never from
    /// a client-supplied id, so one user cannot edit another's account.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ProfileController : ControllerBase
    {
        private readonly IUserService _userService;

        public ProfileController(IUserService userService)
        {
            _userService = userService;
        }

        // Reads the current user's id from the JWT claims.
        private string GetCurrentUserId() =>
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;

        // GET api/profile — returns the logged-in user's own profile.
        [HttpGet]
        public async Task<IActionResult> GetOwnProfile()
        {
            var id = GetCurrentUserId();
            var user = await _userService.GetByIdAsync(id);
            if (user == null)
                return NotFound(new { message = "Profile not found." });

            return Ok(new
            {
                user.Id,
                user.Username,
                user.Email,
                user.Role,
                user.IsActive,
                user.CreatedAt
            });
        }

        // PUT api/profile — updates the logged-in user's own username/email.
        // Role is intentionally excluded — users cannot promote themselves.
        [HttpPut]
        public async Task<IActionResult> UpdateOwnProfile([FromBody] UpdateProfileRequest request)
        {
            var id = GetCurrentUserId();
            var existing = await _userService.GetByIdAsync(id);
            if (existing == null)
                return NotFound(new { message = "Profile not found." });

            try
            {
                var success = await _userService.UpdateAsync(id, request.Username, request.Email, existing.Role);
                if (!success)
                    return StatusCode(500, new { message = "Update failed." });

                return Ok(new { message = "Profile updated successfully." });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // PATCH api/profile/password — changes the logged-in user's own password.
        [HttpPatch("password")]
        public async Task<IActionResult> ChangeOwnPassword([FromBody] ChangePasswordRequest request)
        {
            var id = GetCurrentUserId();
            try
            {
                var success = await _userService.ChangePasswordAsync(id, request.CurrentPassword, request.NewPassword);
                if (!success)
                    return NotFound(new { message = "Profile not found." });

                return Ok(new { message = "Password changed successfully." });
            }
            catch (UnauthorizedAccessException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // DELETE api/profile — deactivates the logged-in user's own account.
        // Blocked if this is the last active Backoffice user, same as admin deactivation.
        [HttpDelete]
        public async Task<IActionResult> DeactivateOwnAccount()
        {
            var id = GetCurrentUserId();
            try
            {
                var success = await _userService.DeactivateAsync(id);
                if (!success)
                    return NotFound(new { message = "Profile not found." });

                return Ok(new { message = "Your account has been deactivated." });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }

    public class UpdateProfileRequest
    {
        public string Username { get; set; } = null!;
        public string Email { get; set; } = null!;
    }

    public class ChangePasswordRequest
    {
        public string CurrentPassword { get; set; } = null!;
        public string NewPassword { get; set; } = null!;
    }
}