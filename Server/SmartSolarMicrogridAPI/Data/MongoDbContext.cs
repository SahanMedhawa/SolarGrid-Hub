// ============================================================
// File: MongoDbContext.cs
// Project: SmartSolarMicrogridAPI
// Description: Provides MongoDB collection accessors for all
//              domain entities in the system.
// ============================================================

using Microsoft.Extensions.Options;
using MongoDB.Driver;
using SmartSolarMicrogridAPI.Models;

namespace SmartSolarMicrogridAPI.Data
{
    /// <summary>
    /// Central MongoDB context providing typed collection references.
    /// </summary>
    public class MongoDbContext
    {
        private readonly IMongoDatabase _database;

        // Initializes the MongoDB client and selects the database.
        public MongoDbContext(IOptions<MongoDbSettings> settings)
        {
            var client = new MongoClient(settings.Value.ConnectionString);
            _database = client.GetDatabase(settings.Value.DatabaseName);
        }

        // Users collection (Backoffice & Grid Operator accounts)
        public IMongoCollection<User> Users =>
            _database.GetCollection<User>("Users");

        // Prosumers collection (solar prosumer profiles)
        public IMongoCollection<Prosumer> Prosumers =>
            _database.GetCollection<Prosumer>("Prosumers");

        // MicrogridNodes collection (solar grid hubs)
        public IMongoCollection<MicrogridNode> MicrogridNodes =>
            _database.GetCollection<MicrogridNode>("MicrogridNodes");

        // EnergySlots collection (available battery/energy slots)
        public IMongoCollection<EnergySlot> EnergySlots =>
            _database.GetCollection<EnergySlot>("EnergySlots");

        // Reservations collection (energy trading reservations)
        public IMongoCollection<Reservation> Reservations =>
            _database.GetCollection<Reservation>("Reservations");
    }
}
