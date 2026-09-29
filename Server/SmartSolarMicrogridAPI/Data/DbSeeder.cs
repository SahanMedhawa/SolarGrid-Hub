// ============================================================
// File: DbSeeder.cs
// Project: SmartSolarMicrogridAPI
// Description: Seeds initial test/demo data into MongoDB for
//              all collections: Users, Prosumers, MicrogridNodes,
//              EnergySlots, and Reservations. Battery slots define
//              the station capacity; reservations use time windows.
// ============================================================

using MongoDB.Driver;
using SmartSolarMicrogridAPI.Models;

namespace SmartSolarMicrogridAPI.Data
{
    /// <summary>
    /// Utility class to seed initial sample data into MongoDB collections.
    /// </summary>
    public static class DbSeeder
    {
        // Seeds all default sample data if collections are empty.
        public static async Task SeedDataAsync(MongoDbContext context)
        {
            // 1. Seed Users (Backoffice & Grid Operator)
            if (await context.Users.CountDocumentsAsync(_ => true) == 0)
            {
                var users = new List<User>
                {
                    new User
                    {
                        Username = "admin",
                        Email = "admin@smartsolar.lk",
                        PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123"),
                        Role = "Backoffice",
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    },
                    new User
                    {
                        Username = "operator1",
                        Email = "operator1@smartsolar.lk",
                        PasswordHash = BCrypt.Net.BCrypt.HashPassword("Operator@123"),
                        Role = "GridOperator",
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    }
                };
                await context.Users.InsertManyAsync(users);
            }

            // 2. Seed Microgrid Nodes with battery slots defining capacity
            if (await context.MicrogridNodes.CountDocumentsAsync(_ => true) == 0)
            {
                // --- Colombo Central Hub ---
                var colomboSlotCapacities = new List<double> { 100, 50, 25, 25, 100, 200 };
                var colombo = new MicrogridNode
                {
                    NodeName = "Colombo Central Hub",
                    Location = "Colombo 03",
                    Latitude = 6.9034,
                    Longitude = 79.8546,
                    CapacityKWh = colomboSlotCapacities.Sum(), // 500 kWh
                    BatterySlots = colomboSlotCapacities.Count,
                    AvailableBatterySlots = colomboSlotCapacities.Count,
                    Schedule = "06:00-18:00",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                await context.MicrogridNodes.InsertOneAsync(colombo);

                var colomboSlots = colomboSlotCapacities.Select((capacity, index) => new EnergySlot
                {
                    NodeId = colombo.Id!,
                    SlotNumber = index + 1,
                    AvailableKWh = capacity,
                    Status = "Available",
                    CreatedAt = DateTime.UtcNow
                }).ToList();
                await context.EnergySlots.InsertManyAsync(colomboSlots);

                // --- Kandy Hill Hub ---
                var kandySlotCapacities = new List<double> { 100, 75, 50, 50, 75 };
                var kandy = new MicrogridNode
                {
                    NodeName = "Kandy Hill Hub",
                    Location = "Peradeniya, Kandy",
                    Latitude = 7.2605,
                    Longitude = 80.5980,
                    CapacityKWh = kandySlotCapacities.Sum(), // 350 kWh
                    BatterySlots = kandySlotCapacities.Count,
                    AvailableBatterySlots = kandySlotCapacities.Count,
                    Schedule = "07:00-17:00",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                await context.MicrogridNodes.InsertOneAsync(kandy);

                var kandySlots = kandySlotCapacities.Select((capacity, index) => new EnergySlot
                {
                    NodeId = kandy.Id!,
                    SlotNumber = index + 1,
                    AvailableKWh = capacity,
                    Status = "Available",
                    CreatedAt = DateTime.UtcNow
                }).ToList();
                await context.EnergySlots.InsertManyAsync(kandySlots);

                // --- Galle Coastal Hub ---
                var galleSlotCapacities = new List<double> { 100, 100, 50, 50, 50, 50 };
                var galle = new MicrogridNode
                {
                    NodeName = "Galle Coastal Hub",
                    Location = "Galle Fort",
                    Latitude = 6.0328,
                    Longitude = 80.2170,
                    CapacityKWh = galleSlotCapacities.Sum(), // 400 kWh
                    BatterySlots = galleSlotCapacities.Count,
                    AvailableBatterySlots = galleSlotCapacities.Count,
                    Schedule = "06:00-18:00",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                await context.MicrogridNodes.InsertOneAsync(galle);

                var galleSlots = galleSlotCapacities.Select((capacity, index) => new EnergySlot
                {
                    NodeId = galle.Id!,
                    SlotNumber = index + 1,
                    AvailableKWh = capacity,
                    Status = "Available",
                    CreatedAt = DateTime.UtcNow
                }).ToList();
                await context.EnergySlots.InsertManyAsync(galleSlots);
            }

            // 3. Seed Prosumers (NIC as primary key)
            if (await context.Prosumers.CountDocumentsAsync(_ => true) == 0)
            {
                var prosumers = new List<Prosumer>
                {
                    new Prosumer
                    {
                        NIC = "199012345678",
                        FirstName = "Kamal",
                        LastName = "Perera",
                        Email = "kamal.perera@gmail.com",
                        Phone = "0771234567",
                        Address = "123 Galle Road, Colombo 03",
                        PasswordHash = BCrypt.Net.BCrypt.HashPassword("Kamal@123"),
                        Status = "Active",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    },
                    new Prosumer
                    {
                        NIC = "199587654321",
                        FirstName = "Nimal",
                        LastName = "Silva",
                        Email = "nimal.silva@gmail.com",
                        Phone = "0719876543",
                        Address = "45 Temple Road, Kandy",
                        PasswordHash = BCrypt.Net.BCrypt.HashPassword("Nimal@123"),
                        Status = "Pending",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    }
                };
                await context.Prosumers.InsertManyAsync(prosumers);
            }

            // 4. Seed a sample reservation (with time window)
            var firstNode = await context.MicrogridNodes.Find(_ => true).FirstOrDefaultAsync();
            if (firstNode != null && await context.Reservations.CountDocumentsAsync(_ => true) == 0)
            {
                var firstSlots = await context.EnergySlots.Find(s => s.NodeId == firstNode.Id).ToListAsync();
                var resId = MongoDB.Bson.ObjectId.GenerateNewId().ToString();
                var reservation = new Reservation
                {
                    Id = resId,
                    ProsumerNic = "199012345678",
                    NodeId = firstNode.Id!,
                    ReservationDate = DateTime.UtcNow.Date.AddDays(3),
                    StartTime = "09:00",
                    EndTime = "10:00",
                    EnergyKWh = 25.0,
                    AllocatedSlotIds = firstSlots.Take(1).Select(s => s.Id!).ToList(),
                    Status = "Approved",
                    QrCodeData = $"SMTS-{resId}-199012345678-{Guid.NewGuid():N}",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                await context.Reservations.InsertOneAsync(reservation);
            }
        }
    }
}
