// ============================================================
// File: DbSeeder.cs
// Project: SmartSolarMicrogridAPI
// Description: Seeds initial test/demo data into MongoDB for
//              all four required collections: Users, Prosumers,
//              MicrogridNodes, EnergySlots, and Reservations.
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

            // 2. Seed Microgrid Nodes (Solar Grid Hubs)
            if (await context.MicrogridNodes.CountDocumentsAsync(_ => true) == 0)
            {
                var nodes = new List<MicrogridNode>
                {
                    new MicrogridNode
                    {
                        NodeName = "Colombo Central Hub",
                        Location = "Colombo 03",
                        Latitude = 6.9034,
                        Longitude = 79.8546,
                        CapacityKWh = 500.0,
                        BatterySlots = 20,
                        AvailableBatterySlots = 18,
                        Schedule = "06:00-18:00",
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    },
                    new MicrogridNode
                    {
                        NodeName = "Kandy Hill Hub",
                        Location = "Peradeniya, Kandy",
                        Latitude = 7.2605,
                        Longitude = 80.5980,
                        CapacityKWh = 350.0,
                        BatterySlots = 15,
                        AvailableBatterySlots = 14,
                        Schedule = "06:00-18:00",
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    },
                    new MicrogridNode
                    {
                        NodeName = "Galle Coastal Hub",
                        Location = "Galle Fort",
                        Latitude = 6.0328,
                        Longitude = 80.2170,
                        CapacityKWh = 400.0,
                        BatterySlots = 16,
                        AvailableBatterySlots = 15,
                        Schedule = "06:00-18:00",
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    }
                };
                await context.MicrogridNodes.InsertManyAsync(nodes);
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

            // 4. Seed Energy Slots
            var firstNode = await context.MicrogridNodes.Find(_ => true).FirstOrDefaultAsync();
            if (firstNode != null && await context.EnergySlots.CountDocumentsAsync(_ => true) == 0)
            {
                var slots = new List<EnergySlot>
                {
                    new EnergySlot
                    {
                        NodeId = firstNode.Id!,
                        SlotDate = DateTime.UtcNow.Date.AddDays(1),
                        StartTime = "09:00",
                        EndTime = "11:00",
                        AvailableKWh = 100.0,
                        Status = "Available",
                        CreatedAt = DateTime.UtcNow
                    },
                    new EnergySlot
                    {
                        NodeId = firstNode.Id!,
                        SlotDate = DateTime.UtcNow.Date.AddDays(2),
                        StartTime = "11:00",
                        EndTime = "13:00",
                        AvailableKWh = 150.0,
                        Status = "Available",
                        CreatedAt = DateTime.UtcNow
                    }
                };
                await context.EnergySlots.InsertManyAsync(slots);
            }

            // 5. Seed Reservations
            if (firstNode != null && await context.Reservations.CountDocumentsAsync(_ => true) == 0)
            {
                var slot = await context.EnergySlots.Find(_ => true).FirstOrDefaultAsync();
                var reservation = new Reservation
                {
                    ProsumerNic = "199012345678",
                    SlotId = slot?.Id ?? "SLOT-001",
                    NodeId = firstNode.Id!,
                    ReservationDate = DateTime.UtcNow.Date.AddDays(3),
                    EnergyKWh = 25.0,
                    Status = "Approved",
                    QrCodeData = $"SMTS-SEEDRES-199012345678-{Guid.NewGuid():N}",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                await context.Reservations.InsertOneAsync(reservation);
            }
        }
    }
}

