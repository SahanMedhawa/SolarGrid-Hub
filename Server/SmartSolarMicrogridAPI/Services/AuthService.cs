// ============================================================
// File: AuthService.cs
// Project: SmartSolarMicrogridAPI
// Description: Implements authentication logic including
//              JWT token generation and password verification.
// ============================================================

using Microsoft.IdentityModel.Tokens;
using MongoDB.Driver;
using SmartSolarMicrogridAPI.Data;
using SmartSolarMicrogridAPI.Models;
using SmartSolarMicrogridAPI.Models.DTOs;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace SmartSolarMicrogridAPI.Services
{
    /// <summary>
    /// Handles user authentication and JWT token generation.
    /// </summary>
    public class AuthService : IAuthService
    {
        private readonly MongoDbContext _context;
        private readonly IConfiguration _configuration;

        // Constructor — injects MongoDB context and app configuration.
        public AuthService(MongoDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        // Authenticates user credentials and returns a login response with JWT.
        public async Task<LoginResponse?> LoginAsync(LoginRequest request)
        {
            if (request.LoginType == "Prosumer")
            {
                // Authenticate as prosumer using NIC
                var prosumer = await _context.Prosumers
                    .Find(p => p.NIC == request.Username && p.Status == "Active")
                    .FirstOrDefaultAsync();

                if (prosumer == null || !BCrypt.Net.BCrypt.Verify(request.Password, prosumer.PasswordHash))
                    return null;

                return new LoginResponse
                {
                    Token = GenerateJwtToken(prosumer.NIC, "Prosumer", $"{prosumer.FirstName} {prosumer.LastName}"),
                    Role = "Prosumer",
                    UserId = prosumer.NIC,
                    DisplayName = $"{prosumer.FirstName} {prosumer.LastName}"
                };
            }
            else
            {
                // Authenticate as web app user (Backoffice / GridOperator)
                var user = await _context.Users
                    .Find(u => u.Username == request.Username && u.IsActive)
                    .FirstOrDefaultAsync();

                if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
                    return null;

                return new LoginResponse
                {
                    Token = GenerateJwtToken(user.Id!, user.Role, user.Username),
                    Role = user.Role,
                    UserId = user.Id!,
                    DisplayName = user.Username
                };
            }
        }

        // Generates a signed JWT token with user claims.
        public string GenerateJwtToken(string userId, string role, string displayName)
        {
            var key = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, userId),
                new Claim(ClaimTypes.Role, role),
                new Claim(ClaimTypes.Name, displayName)
            };

            var expireMinutes = int.Parse(_configuration["Jwt:ExpireMinutes"] ?? "60");

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(expireMinutes),
                signingCredentials: credentials);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
