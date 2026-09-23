// ============================================================
// File: ReservationService.cs
// Project: SmartSolarMicrogridAPI
// Description: Implements reservation management with business
//              rules (7-day window, 12-hour notice, QR codes).
// ============================================================

using MongoDB.Driver;
using SmartSolarMicrogridAPI.Data;
using SmartSolarMicrogridAPI.Models;
using SmartSolarMicrogridAPI.Models.DTOs;

namespace SmartSolarMicrogridAPI.Services
{
    /// <summary>
    /// Handles reservation lifecycle with business rule enforcement.
    /// </summary>
    public class ReservationService : IReservationService
    {
        private readonly MongoDbContext _context;

        // Constructor — injects MongoDB context.
        public ReservationService(MongoDbContext context)
        {
            _context = context;
        }

        // Returns all reservations.
        public async Task<List<Reservation>> GetAllAsync()
        {
            return await _context.Reservations.Find(_ => true).ToListAsync();
        }

        // Finds a reservation by ID.
        public async Task<Reservation?> GetByIdAsync(string id)
        {
            return await _context.Reservations.Find(r => r.Id == id).FirstOrDefaultAsync();
        }

        // Returns all reservations for a given prosumer NIC.
        public async Task<List<Reservation>> GetByProsumerNicAsync(string nic)
        {
            return await _context.Reservations.Find(r => r.ProsumerNic == nic).ToListAsync();
        }

        // Returns reservations filtered by status.
        public async Task<List<Reservation>> GetByStatusAsync(string status)
        {
            return await _context.Reservations.Find(r => r.Status == status).ToListAsync();
        }

        // Counts approved reservations with future dates for a prosumer.
        public async Task<long> GetApprovedFutureCountAsync(string nic)
        {
            return await _context.Reservations.CountDocumentsAsync(
                r => r.ProsumerNic == nic &&
                     r.Status == "Approved" &&
                     r.ReservationDate > DateTime.UtcNow);
        }

        // Creates a reservation, enforcing the 7-day scheduling window.
        public async Task<(bool Success, string Message, Reservation? Reservation)> CreateAsync(
            CreateReservationRequest request)
        {
            // Business Rule: Reservation must be scheduled within 7 days
            if (request.ReservationDate > DateTime.UtcNow.AddDays(7))
            {
                return (false, "Reservation must be scheduled within the next 7 days.", null);
            }

            if (request.ReservationDate < DateTime.UtcNow)
            {
                return (false, "Reservation date cannot be in the past.", null);
            }

            var reservation = new Reservation
            {
                ProsumerNic = request.ProsumerNic,
                SlotId = request.SlotId,
                NodeId = request.NodeId,
                ReservationDate = request.ReservationDate,
                EnergyKWh = request.EnergyKWh,
                Status = "Pending",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _context.Reservations.InsertOneAsync(reservation);
            return (true, "Reservation created successfully.", reservation);
        }

        // Updates a reservation, enforcing the 12-hour notice rule.
        public async Task<(bool Success, string Message)> UpdateAsync(
            string id, UpdateReservationRequest request)
        {
            var reservation = await GetByIdAsync(id);
            if (reservation == null)
                return (false, "Reservation not found.");

            // Business Rule: Updates require at least 12 hours' notice
            if (reservation.ReservationDate <= DateTime.UtcNow.AddHours(12))
            {
                return (false, "Updates require at least 12 hours' notice before the reservation date.");
            }

            var updateBuilder = Builders<Reservation>.Update
                .Set(r => r.UpdatedAt, DateTime.UtcNow);

            if (request.SlotId != null)
                updateBuilder = updateBuilder.Set(r => r.SlotId, request.SlotId);
            if (request.ReservationDate.HasValue)
            {
                // Validate new date is within 7 days
                if (request.ReservationDate.Value > DateTime.UtcNow.AddDays(7))
                    return (false, "New reservation date must be within the next 7 days.");
                updateBuilder = updateBuilder.Set(r => r.ReservationDate, request.ReservationDate.Value);
            }
            if (request.EnergyKWh.HasValue)
                updateBuilder = updateBuilder.Set(r => r.EnergyKWh, request.EnergyKWh.Value);

            var result = await _context.Reservations.UpdateOneAsync(
                r => r.Id == id, updateBuilder);

            return result.ModifiedCount > 0
                ? (true, "Reservation updated successfully.")
                : (false, "No changes were made.");
        }

        // Cancels a reservation, enforcing the 12-hour notice rule.
        public async Task<(bool Success, string Message)> CancelAsync(string id)
        {
            var reservation = await GetByIdAsync(id);
            if (reservation == null)
                return (false, "Reservation not found.");

            // Business Rule: Cancellations require at least 12 hours' notice
            if (reservation.ReservationDate <= DateTime.UtcNow.AddHours(12))
            {
                return (false, "Cancellations require at least 12 hours' notice before the reservation date.");
            }

            var update = Builders<Reservation>.Update
                .Set(r => r.Status, "Cancelled")
                .Set(r => r.UpdatedAt, DateTime.UtcNow);

            var result = await _context.Reservations.UpdateOneAsync(
                r => r.Id == id, update);

            return result.ModifiedCount > 0
                ? (true, "Reservation cancelled successfully.")
                : (false, "Failed to cancel reservation.");
        }

        // Approves a pending reservation and generates a QR code string.
        public async Task<(bool Success, string Message)> ApproveAsync(string id)
        {
            var reservation = await GetByIdAsync(id);
            if (reservation == null)
                return (false, "Reservation not found.");

            if (reservation.Status != "Pending")
                return (false, "Only pending reservations can be approved.");

            // Generate secure QR code data
            var qrData = $"SMTS-{reservation.Id}-{reservation.ProsumerNic}-{Guid.NewGuid():N}";

            var update = Builders<Reservation>.Update
                .Set(r => r.Status, "Approved")
                .Set(r => r.QrCodeData, qrData)
                .Set(r => r.UpdatedAt, DateTime.UtcNow);

            var result = await _context.Reservations.UpdateOneAsync(
                r => r.Id == id, update);

            return result.ModifiedCount > 0
                ? (true, "Reservation approved. QR code generated.")
                : (false, "Failed to approve reservation.");
        }

        // Verifies QR code and marks the reservation as completed.
        public async Task<(bool Success, string Message)> CompleteAsync(string id, string qrData)
        {
            var reservation = await GetByIdAsync(id);
            if (reservation == null)
                return (false, "Reservation not found.");

            if (reservation.Status != "Approved")
                return (false, "Only approved reservations can be completed.");

            if (reservation.QrCodeData != qrData)
                return (false, "QR code verification failed.");

            var update = Builders<Reservation>.Update
                .Set(r => r.Status, "Completed")
                .Set(r => r.UpdatedAt, DateTime.UtcNow);

            var result = await _context.Reservations.UpdateOneAsync(
                r => r.Id == id, update);

            return result.ModifiedCount > 0
                ? (true, "Energy transfer completed successfully.")
                : (false, "Failed to complete reservation.");
        }
    }
}
