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

        // Counts pending reservations for a prosumer.
        public async Task<long> GetPendingCountByProsumerAsync(string nic)
        {
            return await _context.Reservations.CountDocumentsAsync(
                r => r.ProsumerNic == nic &&
                     r.Status == "Pending");
        }

        // Creates a reservation, enforcing business rules (7-day window, active prosumer, active node, capacity, battery slot).
        public async Task<(bool Success, string Message, Reservation? Reservation)> CreateAsync(
            CreateReservationRequest request)
        {
            // Business Rule: Reservation must be scheduled within 7 days
            if (request.ReservationDate > DateTime.UtcNow.AddDays(7))
            {
                return (false, "Reservation must be scheduled within the next 7 days.", null);
            }

            // Business Rule: Reservation date cannot be in the past (5 minute skew buffer)
            if (request.ReservationDate < DateTime.UtcNow.AddMinutes(-5))
            {
                return (false, "Reservation date cannot be in the past.", null);
            }

            // Business Rule: Validate energy amount is positive
            if (request.EnergyKWh <= 0)
            {
                return (false, "Energy amount must be greater than 0 kWh.", null);
            }

            // Business Rule: Prosumer must exist and have "Active" status
            var prosumer = await _context.Prosumers
                .Find(p => p.NIC == request.ProsumerNic)
                .FirstOrDefaultAsync();

            if (prosumer == null)
            {
                return (false, "Prosumer profile not found.", null);
            }

            if (!string.Equals(prosumer.Status, "Active", StringComparison.OrdinalIgnoreCase))
            {
                return (false, $"Prosumer account is currently {prosumer.Status.ToLower()}. Only active accounts can create reservations.", null);
            }

            // Business Rule: Node must exist and be active
            var node = await _context.MicrogridNodes
                .Find(n => n.Id == request.NodeId)
                .FirstOrDefaultAsync();

            if (node == null)
            {
                return (false, "Microgrid node not found.", null);
            }

            if (!node.IsActive)
            {
                return (false, "Microgrid node is currently inactive and cannot accept reservations.", null);
            }

            // Business Rule: Node must have available battery storage slots
            if (node.AvailableBatterySlots <= 0)
            {
                return (false, "No battery storage slots are currently available at this microgrid node.", null);
            }

            // Business Rule: Requested energy cannot exceed node capacity
            if (request.EnergyKWh > node.CapacityKWh)
            {
                return (false, $"Requested energy ({request.EnergyKWh} kWh) exceeds the node maximum capacity ({node.CapacityKWh} kWh).", null);
            }

            // Check if slot exists in EnergySlots collection
            var energySlot = await _context.EnergySlots
                .Find(s => s.Id == request.SlotId)
                .FirstOrDefaultAsync();

            if (energySlot != null)
            {
                if (energySlot.NodeId != request.NodeId)
                {
                    return (false, "The selected energy slot does not belong to the selected microgrid node.", null);
                }

                if (!string.Equals(energySlot.Status, "Available", StringComparison.OrdinalIgnoreCase))
                {
                    return (false, "The selected energy slot is no longer available.", null);
                }
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

        // Updates a reservation, enforcing the 12-hour notice rule and modification constraints.
        public async Task<(bool Success, string Message)> UpdateAsync(
            string id, UpdateReservationRequest request)
        {
            var reservation = await GetByIdAsync(id);
            if (reservation == null)
                return (false, "Reservation not found.");

            // Business Rule: Cancelled or Completed reservations cannot be updated
            if (string.Equals(reservation.Status, "Cancelled", StringComparison.OrdinalIgnoreCase))
            {
                return (false, "Cannot update a cancelled reservation.");
            }

            if (string.Equals(reservation.Status, "Completed", StringComparison.OrdinalIgnoreCase))
            {
                return (false, "Cannot update a completed energy transfer.");
            }

            // Business Rule: Updates require at least 12 hours' notice before current reservation date
            if (reservation.ReservationDate <= DateTime.UtcNow.AddHours(12))
            {
                return (false, "Updates require at least 12 hours' notice before the scheduled reservation date.");
            }

            var updateBuilder = Builders<Reservation>.Update
                .Set(r => r.UpdatedAt, DateTime.UtcNow);

            var currentNodeId = !string.IsNullOrWhiteSpace(request.NodeId) ? request.NodeId : reservation.NodeId;

            // Validate node if changed
            if (!string.IsNullOrWhiteSpace(request.NodeId) && request.NodeId != reservation.NodeId)
            {
                var newNode = await _context.MicrogridNodes.Find(n => n.Id == request.NodeId).FirstOrDefaultAsync();
                if (newNode == null || !newNode.IsActive)
                    return (false, "New microgrid node not found or inactive.");
                updateBuilder = updateBuilder.Set(r => r.NodeId, request.NodeId);
            }

            if (request.SlotId != null)
                updateBuilder = updateBuilder.Set(r => r.SlotId, request.SlotId);

            if (request.ReservationDate.HasValue)
            {
                var newDate = request.ReservationDate.Value;

                // Validate new date is at least 12 hours in advance
                if (newDate <= DateTime.UtcNow.AddHours(12))
                    return (false, "New reservation date must be at least 12 hours from now.");

                // Validate new date is within 7 days
                if (newDate > DateTime.UtcNow.AddDays(7))
                    return (false, "New reservation date must be within the next 7 days.");

                updateBuilder = updateBuilder.Set(r => r.ReservationDate, newDate);
            }

            if (request.EnergyKWh.HasValue)
            {
                if (request.EnergyKWh.Value <= 0)
                    return (false, "Energy amount must be greater than 0 kWh.");

                var targetNode = await _context.MicrogridNodes.Find(n => n.Id == currentNodeId).FirstOrDefaultAsync();
                if (targetNode != null && request.EnergyKWh.Value > targetNode.CapacityKWh)
                {
                    return (false, $"Requested energy ({request.EnergyKWh.Value} kWh) exceeds the node maximum capacity ({targetNode.CapacityKWh} kWh).");
                }

                updateBuilder = updateBuilder.Set(r => r.EnergyKWh, request.EnergyKWh.Value);
            }

            var result = await _context.Reservations.UpdateOneAsync(
                r => r.Id == id, updateBuilder);

            return result.ModifiedCount > 0
                ? (true, "Reservation updated successfully.")
                : (false, "No changes were made.");
        }

        // Cancels a reservation, enforcing the 12-hour notice rule and releasing allocated resources.
        public async Task<(bool Success, string Message)> CancelAsync(string id)
        {
            var reservation = await GetByIdAsync(id);
            if (reservation == null)
                return (false, "Reservation not found.");

            // Business Rule: Cannot cancel if already cancelled
            if (string.Equals(reservation.Status, "Cancelled", StringComparison.OrdinalIgnoreCase))
            {
                return (false, "Reservation is already cancelled.");
            }

            // Business Rule: Cannot cancel if already completed
            if (string.Equals(reservation.Status, "Completed", StringComparison.OrdinalIgnoreCase))
            {
                return (false, "Cannot cancel a completed energy transfer.");
            }

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

            if (result.ModifiedCount > 0)
            {
                // If reservation was Approved, restore battery slot availability on the node
                if (string.Equals(reservation.Status, "Approved", StringComparison.OrdinalIgnoreCase))
                {
                    var node = await _context.MicrogridNodes.Find(n => n.Id == reservation.NodeId).FirstOrDefaultAsync();
                    if (node != null && node.AvailableBatterySlots < node.BatterySlots)
                    {
                        await _context.MicrogridNodes.UpdateOneAsync(
                            n => n.Id == node.Id,
                            Builders<MicrogridNode>.Update.Inc(n => n.AvailableBatterySlots, 1)
                        );
                    }

                    // Restore energy slot status if tracked
                    await _context.EnergySlots.UpdateOneAsync(
                        s => s.Id == reservation.SlotId && s.Status == "Reserved",
                        Builders<EnergySlot>.Update.Set(s => s.Status, "Available")
                    );
                }

                return (true, "Reservation cancelled successfully.");
            }

            return (false, "Failed to cancel reservation.");
        }

        // Approves a pending reservation, decrements battery slot, and generates a secure QR code string.
        public async Task<(bool Success, string Message)> ApproveAsync(string id)
        {
            var reservation = await GetByIdAsync(id);
            if (reservation == null)
                return (false, "Reservation not found.");

            if (!string.Equals(reservation.Status, "Pending", StringComparison.OrdinalIgnoreCase))
                return (false, $"Only pending reservations can be approved. Current status: {reservation.Status}.");

            // Verify microgrid node has available battery slots
            var node = await _context.MicrogridNodes.Find(n => n.Id == reservation.NodeId).FirstOrDefaultAsync();
            if (node == null || !node.IsActive)
                return (false, "Microgrid node is unavailable or inactive.");

            if (node.AvailableBatterySlots <= 0)
                return (false, "Cannot approve: no battery storage slots currently available at this node.");

            // Generate secure QR code data: SMTS-{reservationId}-{prosumerNic}-{guid}
            var qrData = $"SMTS-{reservation.Id}-{reservation.ProsumerNic}-{Guid.NewGuid():N}";

            var update = Builders<Reservation>.Update
                .Set(r => r.Status, "Approved")
                .Set(r => r.QrCodeData, qrData)
                .Set(r => r.UpdatedAt, DateTime.UtcNow);

            var result = await _context.Reservations.UpdateOneAsync(
                r => r.Id == id, update);

            if (result.ModifiedCount > 0)
            {
                // Decrement available battery slot to reserve for this booking
                await _context.MicrogridNodes.UpdateOneAsync(
                    n => n.Id == node.Id && n.AvailableBatterySlots > 0,
                    Builders<MicrogridNode>.Update.Inc(n => n.AvailableBatterySlots, -1)
                );

                // Update energy slot status if matched
                await _context.EnergySlots.UpdateOneAsync(
                    s => s.Id == reservation.SlotId && s.Status == "Available",
                    Builders<EnergySlot>.Update.Set(s => s.Status, "Reserved")
                );

                return (true, "Reservation approved. QR code generated.");
            }

            return (false, "Failed to approve reservation.");
        }

        // Verifies QR code, marks reservation as completed, releases battery slot, and finalizes transfer.
        public async Task<(bool Success, string Message)> CompleteAsync(string id, string qrData)
        {
            var reservation = await GetByIdAsync(id);
            if (reservation == null)
                return (false, "Reservation not found.");

            if (!string.Equals(reservation.Status, "Approved", StringComparison.OrdinalIgnoreCase))
                return (false, $"Only approved reservations can be completed. Current status: {reservation.Status}.");

            if (string.IsNullOrWhiteSpace(qrData) ||
                !string.Equals(reservation.QrCodeData?.Trim(), qrData.Trim(), StringComparison.Ordinal))
            {
                return (false, "QR code verification failed. Scanned token does not match reservation records.");
            }

            var update = Builders<Reservation>.Update
                .Set(r => r.Status, "Completed")
                .Set(r => r.UpdatedAt, DateTime.UtcNow);

            var result = await _context.Reservations.UpdateOneAsync(
                r => r.Id == id, update);

            if (result.ModifiedCount > 0)
            {
                // Finalize energy transfer: release battery slot back to available storage pool
                var node = await _context.MicrogridNodes.Find(n => n.Id == reservation.NodeId).FirstOrDefaultAsync();
                if (node != null && node.AvailableBatterySlots < node.BatterySlots)
                {
                    await _context.MicrogridNodes.UpdateOneAsync(
                        n => n.Id == node.Id,
                        Builders<MicrogridNode>.Update.Inc(n => n.AvailableBatterySlots, 1)
                    );
                }

                // Mark energy slot as completed if matched
                await _context.EnergySlots.UpdateOneAsync(
                    s => s.Id == reservation.SlotId,
                    Builders<EnergySlot>.Update.Set(s => s.Status, "Completed")
                );

                return (true, "Energy transfer completed successfully.");
            }

            return (false, "Failed to complete reservation.");
        }
    }
}
