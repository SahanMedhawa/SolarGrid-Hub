// ============================================================
// File: Program.cs
// Project: SmartSolarMicrogridAPI
// Description: Application entry point. Configures services,
//              middleware, authentication, and MongoDB connection.
// ============================================================

using SmartSolarMicrogridAPI.Data;
using SmartSolarMicrogridAPI.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// --------------- MongoDB Configuration ---------------
builder.Services.Configure<MongoDbSettings>(
    builder.Configuration.GetSection("MongoDbSettings"));
builder.Services.AddSingleton<MongoDbContext>();

// --------------- Service Registration ---------------
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IProsumerService, ProsumerService>();
builder.Services.AddScoped<IMicrogridNodeService, MicrogridNodeService>();
builder.Services.AddScoped<IReservationService, ReservationService>();

// --------------- JWT Authentication ---------------
var jwtKey = builder.Configuration["Jwt:Key"] ?? "DefaultSuperSecretKey12345678901234";
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// --------------- CORS ---------------
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader());
});

var app = builder.Build();

// --------------- Middleware Pipeline ---------------
    app.UseSwagger();
    app.UseSwaggerUI();


app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// --------------- Seed Initial Data ---------------
try
{
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<MongoDbContext>();
    await DbSeeder.SeedDataAsync(dbContext);
}
catch (Exception ex)
{
    app.Logger.LogWarning(ex, "MongoDB seeding skipped: Database might not be running yet.");
}

app.Run();
