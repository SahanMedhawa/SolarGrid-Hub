// ============================================================
// File: ReservationService.cs
// Project: SmartSolarMicrogridAPI
// Description: Implements reservation management with
//              time-window-based capacity evaluation, overlap
//              detection, operating-hours enforcement, battery
//              slot allocation, 7-day/12-hour rules, QR codes,
//              and per-node locking for race condition prevention.
// ============================================================

using System.Collections.Concurrent;
using System.Globalization;
using MongoDB.Driver;
using SmartSolarMicrogridAPI.Data;
using SmartSolarMicrogridAPI.Models;
using SmartSolarMicrogridAPI.Models.DTOs;

namespace SmartSolarMicrogridAPI.Services
{
    /// <summary>
    /// Handles reservation lifecycle with time-based capacity enforcement.
    /// </summary>
    public class ReservationService : IReservationService
    {
        private readonly MongoDbContext _context;

        // Per-node locks to prevent race conditions / double booking.
        private static readonly ConcurrentDictionary<string, SemaphoreSlim> _nodeLocks = new();

        private static SemaphoreSlim GetNodeLock(string nodeId)
            => _nodeLocks.GetOrAdd(nodeId, _ => new SemaphoreSlim(1, 1));

        // Constructor — injects MongoDB context.
        public ReservationService(MongoDbContext context)
        {
            _context = context;
        }

        // Returns all reservations.
        public async Task<List<Reservation>> GetAllAsync()
        {
            var list = await _context.Reservations.Find(_ => true).ToListAsync();
            await PopulateSlotNamesAsync(list);
            return list;
        }

        // Finds a reservation by ID.
        public async Task<Reservation?> GetByIdAsync(string id)
        {
            var res = await _context.Reservations.Find(r => r.Id == id).FirstOrDefaultAsync();
            if (res != null) await PopulateSlotNamesAsync(new List<Reservation> { res });
            return res;
        }

        // Returns all reservations for a given prosumer NIC.
        public async Task<List<Reservation>> GetByProsumerNicAsync(string nic)
        {
            var list = await _context.Reservations.Find(r => r.ProsumerNic == nic).ToListAsync();
            await PopulateSlotNamesAsync(list);
            return list;
        }

        // Returns reservations filtered by status.
        public async Task<List<Reservation>> GetByStatusAsync(string status)
        {
            var list = await _context.Reservations.Find(r => r.Status == status).ToListAsync();
            await PopulateSlotNamesAsync(list);
            return list;
        }

        private async Task PopulateSlotNamesAsync(List<Reservation> reservations)
        {
            var missing = reservations.Where(r => (r.AllocatedSlotNames == null || r.AllocatedSlotNames.Count == 0) && r.AllocatedSlotIds != null && r.AllocatedSlotIds.Count > 0).ToList();
            if (!missing.Any()) return;

            var allSlotIds = missing.SelectMany(r => r.AllocatedSlotIds).Distinct().ToList();
            var slots = await _context.EnergySlots.Find(s => allSlotIds.Contains(s.Id!)).ToListAsync();
            var slotMap = slots.ToDictionary(s => s.Id!, s => $"Slot #{s.SlotNumber}");

            foreach (var r in missing)
            {
                r.AllocatedSlotNames = r.AllocatedSlotIds
                    .Select((id, idx) => slotMap.TryGetValue(id, out var name) ? name : $"Slot #{idx + 1}")
                    .ToList();
            }
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

        // ────────────────────────────────────────────────────────────
        //  AVAILABILITY — Time-Based Capacity Evaluation
        // ────────────────────────────────────────────────────────────

        /// <summary>
        /// Calculates available capacity for a station at a specific date and time window.
        /// </summary>
        public async Task<AvailabilityResponse> GetAvailabilityAsync(
            string nodeId, DateTime date, string startTime, string endTime)
        {
            var node = await _context.MicrogridNodes.Find(n => n.Id == nodeId).FirstOrDefaultAsync();
            if (node == null)
                throw new ArgumentException("Microgrid node not found.");

            // Get all battery slots for this node
            var slots = await _context.EnergySlots.Find(s => s.NodeId == nodeId).ToListAsync();
            var activeSlots = slots.Where(s => IsAvailableForWindow(s, date, startTime, endTime)).ToList();
            var maintenanceSlots = slots.Except(activeSlots).ToList();

            var totalCapacity = activeSlots.Sum(s => s.AvailableKWh);

            // Get active reservations for this node on the same date
            var reservedKWh = await GetOverlappingReservedKWhAsync(nodeId, date, startTime, endTime);

            // Check operating hours
            var isWithinHours = IsWithinOperatingHours(node.Schedule, startTime, endTime);

            // Determine occupied slots in this specific time window
            var dateStart = date.Date;
            var dateEnd = dateStart.AddDays(1);
            var dayReservations = await _context.Reservations
                .Find(r => r.NodeId == nodeId &&
                           r.ReservationDate >= dateStart && r.ReservationDate < dateEnd &&
                           (r.Status == "Pending" || r.Status == "Approved"))
                .ToListAsync();

            var overlapping = dayReservations
                .Where(r => !string.IsNullOrEmpty(r.StartTime) && !string.IsNullOrEmpty(r.EndTime))
                .Where(r => TimesOverlap(r.StartTime, r.EndTime, startTime, endTime))
                .ToList();

            var occupiedSlotIds = overlapping
                .SelectMany(r => r.AllocatedSlotIds ?? new List<string>())
                .ToHashSet();

            var slotList = slots
                .OrderBy(s => s.SlotNumber)
                .Select(s => new SlotAvailabilityInfo
                {
                    Id = s.Id ?? string.Empty,
                    SlotNumber = s.SlotNumber,
                    CapacityKWh = s.AvailableKWh,
                    Status = s.Status,
                    IsBooked = occupiedSlotIds.Contains(s.Id ?? string.Empty),
                    IsAvailable = !occupiedSlotIds.Contains(s.Id ?? string.Empty) &&
                                  !string.Equals(s.Status, "Maintenance", StringComparison.OrdinalIgnoreCase)
                })
                .ToList();

            return new AvailabilityResponse
            {
                NodeId = nodeId,
                NodeName = node.NodeName,
                Date = date.ToString("yyyy-MM-dd"),
                StartTime = startTime,
                EndTime = endTime,
                TotalCapacityKWh = totalCapacity,
                ReservedKWh = reservedKWh,
                AvailableKWh = Math.Max(0, totalCapacity - reservedKWh),
                MaintenanceSlotsCount = maintenanceSlots.Count,
                MaintenanceCapacityKWh = maintenanceSlots.Sum(s => s.AvailableKWh),
                Schedule = node.Schedule,
                IsWithinOperatingHours = isWithinHours,
                Slots = slotList
            };
        }

        /// <summary>
        /// Returns hourly availability for all operating hours of a station on a given date.
        /// </summary>
        public async Task<HourlyAvailabilityResponse> GetHourlyAvailabilityAsync(
            string nodeId, DateTime date)
        {
            var node = await _context.MicrogridNodes.Find(n => n.Id == nodeId).FirstOrDefaultAsync();
            if (node == null)
                throw new ArgumentException("Microgrid node not found.");

            var slots = await _context.EnergySlots.Find(s => s.NodeId == nodeId).ToListAsync();
            var totalCapacity = slots
                .Where(s => !string.Equals(s.Status, "Maintenance", StringComparison.OrdinalIgnoreCase) || s.MaintenanceDate.HasValue)
                .Sum(s => s.AvailableKWh);

            var (open, close) = ParseSchedule(node.Schedule);

            // Get ALL active reservations for this node on this date (fetch once for efficiency)
            var dateStart = date.Date;
            var dateEnd = dateStart.AddDays(1);
            var dayReservations = await _context.Reservations
                .Find(r => r.NodeId == nodeId &&
                           r.ReservationDate >= dateStart && r.ReservationDate < dateEnd &&
                           (r.Status == "Pending" || r.Status == "Approved"))
                .ToListAsync();

            var hourlySlots = new List<HourlySlot>();

            // Generate hourly slots from 00:00 to 23:00
            for (int hour = 0; hour < 24; hour++)
            {
                var slotStart = new TimeOnly(hour, 0);
                var slotEnd = new TimeOnly(hour, 0).AddHours(1);
                // Handle 23:00 → 00:00 edge case
                if (hour == 23) slotEnd = new TimeOnly(23, 59);

                var startStr = slotStart.ToString("HH:mm");
                var endStr = hour == 23 ? "24:00" : slotEnd.ToString("HH:mm");

                var isWithinHours = slotStart >= open && (hour == 23 ? new TimeOnly(23, 59) : slotEnd) <= close;

                // Calculate reserved kWh from overlapping reservations
                var reserved = dayReservations
                    .Where(r => TimesOverlap(r.StartTime, r.EndTime, startStr, endStr))
                    .Sum(r => r.EnergyKWh);

                var hourCapacity = slots
                    .Where(s => IsAvailableForWindow(s, date, startStr, endStr))
                    .Sum(s => s.AvailableKWh);
                var available = Math.Max(0, hourCapacity - reserved);

                hourlySlots.Add(new HourlySlot
                {
                    StartTime = startStr,
                    EndTime = endStr,
                    ReservedKWh = reserved,
                    AvailableKWh = available,
                    IsWithinOperatingHours = isWithinHours,
                    IsFull = available < 0.001
                });
            }

            return new HourlyAvailabilityResponse
            {
                NodeId = nodeId,
                NodeName = node.NodeName,
                Date = date.ToString("yyyy-MM-dd"),
                Schedule = node.Schedule,
                TotalCapacityKWh = totalCapacity,
                HourlySlots = hourlySlots
            };
        }

        // ────────────────────────────────────────────────────────────
        //  CREATE RESERVATION
        // ────────────────────────────────────────────────────────────

        /// <summary>
        /// Creates a reservation enforcing: 7-day window, operating hours,
        /// time-based capacity, slot allocation, and race condition safety.
        /// </summary>
        public async Task<(bool Success, string Message, Reservation? Reservation)> CreateAsync(
            CreateReservationRequest request)
        {
            // ── Validate time format ──
            if (!TryParseTime(request.StartTime, out var reqStart))
            {
                return (false, "Start time must be a valid time in HH:mm format.", null);
            }

            // ── Business Rule: Every energy reservation is exactly one hour ──
            // Automatically sets the end time to one hour after start time. Multi-hour reservations not supported.
            var calculatedEnd = reqStart.AddHours(1);
            string calculatedEndStr = (calculatedEnd.Hour == 0 && reqStart.Hour == 23) ? "24:00" : calculatedEnd.ToString("HH:mm");

            if (string.IsNullOrWhiteSpace(request.EndTime))
            {
                request.EndTime = calculatedEndStr;
            }
            else
            {
                if (!TryParseTime(request.EndTime, out var reqEnd))
                {
                    return (false, "End time must be a valid time in HH:mm format.", null);
                }

                var durationMinutes = (reqEnd.ToTimeSpan() - reqStart.ToTimeSpan()).TotalMinutes;
                if (Math.Abs(durationMinutes - 60) > 1)
                {
                    return (false, $"Every energy reservation must be exactly one hour. For start time {request.StartTime}, end time is automatically {calculatedEndStr}. Multi-hour reservations are not supported.", null);
                }
                request.EndTime = calculatedEndStr;
            }

            // ── Business Rule: Reservation must be scheduled within 7 days ──
            if (request.ReservationDate.Date > DateTime.UtcNow.AddDays(7).Date)
            {
                return (false, "Reservation must be scheduled within the next 7 days.", null);
            }

            // ── Business Rule: Reservation date cannot be in the past (5 minute skew buffer) ──
            if (request.ReservationDate.Date < DateTime.UtcNow.Date.AddMinutes(-5))
            {
                return (false, "Reservation date cannot be in the past.", null);
            }

            // ── Business Rule: Validate energy amount is positive or specific slots selected ──
            if (request.EnergyKWh <= 0 && (request.SelectedSlotIds == null || !request.SelectedSlotIds.Any()))
            {
                return (false, "Energy amount must be greater than 0 kWh or specific battery slots must be selected.", null);
            }

            // ── Business Rule: Prosumer must exist and have "Active" status ──
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

            // ── Business Rule: Node must exist and be active ──
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

            // ── Business Rule: Requested time must be within station operating hours ──
            if (!IsWithinOperatingHours(node.Schedule, request.StartTime, request.EndTime))
            {
                return (false, $"Reservation time ({request.StartTime}–{request.EndTime}) falls outside station operating hours ({node.Schedule}).", null);
            }

            // ── Lock per node to prevent race conditions / double booking ──
            var nodeLock = GetNodeLock(request.NodeId);
            await nodeLock.WaitAsync();
            try
            {
                // ── Business Rule: Capacity must be available for the requested time window ──
                var slots = await _context.EnergySlots.Find(s => s.NodeId == request.NodeId).ToListAsync();
                var activeSlots = slots
                    .Where(s => IsAvailableForWindow(s, request.ReservationDate, request.StartTime, request.EndTime))
                    .ToList();

                var totalCapacity = activeSlots.Sum(s => s.AvailableKWh);

                List<string> allocatedSlotIds;
                double effectiveEnergyKWh = request.EnergyKWh;

                if (request.SelectedSlotIds != null && request.SelectedSlotIds.Any())
                {
                    // Prosumer selected specific physical battery slots
                    var selectedSlots = activeSlots.Where(s => request.SelectedSlotIds.Contains(s.Id!)).ToList();
                    if (selectedSlots.Count != request.SelectedSlotIds.Distinct().Count())
                    {
                        return (false, "One or more selected battery slots do not exist or are currently under maintenance.", null);
                    }

                    // Check if any selected slot is already occupied during this time window
                    var dateStart = request.ReservationDate.Date;
                    var dateEnd = dateStart.AddDays(1);
                    var dayReservations = await _context.Reservations
                        .Find(r => r.NodeId == request.NodeId &&
                                   r.ReservationDate >= dateStart && r.ReservationDate < dateEnd &&
                                   (r.Status == "Pending" || r.Status == "Approved"))
                        .ToListAsync();

                    var occupiedSlotIds = dayReservations
                        .Where(r => !string.IsNullOrEmpty(r.StartTime) && !string.IsNullOrEmpty(r.EndTime))
                        .Where(r => TimesOverlap(r.StartTime, r.EndTime, request.StartTime, request.EndTime))
                        .SelectMany(r => r.AllocatedSlotIds ?? new List<string>())
                        .ToHashSet();

                    var conflict = selectedSlots.FirstOrDefault(s => occupiedSlotIds.Contains(s.Id!));
                    if (conflict != null)
                    {
                        return (false, $"Slot #{conflict.SlotNumber} ({conflict.AvailableKWh} kWh) is already reserved for this time window. Please choose another slot.", null);
                    }

                    allocatedSlotIds = selectedSlots.Select(s => s.Id!).ToList();
                    effectiveEnergyKWh = selectedSlots.Sum(s => s.AvailableKWh);
                }
                else
                {
                    // ── Business Rule: Requested energy cannot exceed total operational capacity ──
                    if (request.EnergyKWh > totalCapacity)
                    {
                        return (false, $"Requested energy ({request.EnergyKWh} kWh) exceeds the station's operational capacity ({totalCapacity} kWh).", null);
                    }

                    // ── Business Rule: Check overlapping reservations and available capacity ──
                    var reservedKWh = await GetOverlappingReservedKWhAsync(
                        request.NodeId, request.ReservationDate, request.StartTime, request.EndTime);

                    var availableKWh = totalCapacity - reservedKWh;

                    if (request.EnergyKWh > availableKWh)
                    {
                        return (false,
                            $"Insufficient capacity for {request.StartTime}–{request.EndTime} on {request.ReservationDate:yyyy-MM-dd}. " +
                            $"Available: {availableKWh:0.##} kWh, Requested: {request.EnergyKWh} kWh.",
                            null);
                    }

                    // ── Allocate battery slots (first-fit) ──
                    allocatedSlotIds = await AllocateSlotsAsync(
                        request.NodeId, request.ReservationDate,
                        request.StartTime, request.EndTime, request.EnergyKWh);
                }

                // ── Resolve Slot Names for human-friendly display ──
                var slotObjects = await _context.EnergySlots.Find(s => allocatedSlotIds.Contains(s.Id!)).ToListAsync();
                var allocatedSlotNames = slotObjects.OrderBy(s => s.SlotNumber).Select(s => $"Slot #{s.SlotNumber}").ToList();
                if (!allocatedSlotNames.Any() && allocatedSlotIds.Any())
                {
                    allocatedSlotNames = allocatedSlotIds.Select((_, idx) => $"Slot #{idx + 1}").ToList();
                }

                var reservation = new Reservation
                {
                    ProsumerNic = request.ProsumerNic,
                    NodeId = request.NodeId,
                    ReservationDate = request.ReservationDate.Date,
                    StartTime = request.StartTime,
                    EndTime = request.EndTime,
                    EnergyKWh = effectiveEnergyKWh,
                    AllocatedSlotIds = allocatedSlotIds,
                    AllocatedSlotNames = allocatedSlotNames,
                    Status = "Pending",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                await _context.Reservations.InsertOneAsync(reservation);
                return (true, "Reservation created successfully.", reservation);
            }
            finally
            {
                nodeLock.Release();
            }
        }

        // ────────────────────────────────────────────────────────────
        //  UPDATE RESERVATION
        // ────────────────────────────────────────────────────────────

        /// <summary>
        /// Updates a reservation enforcing: 12-hour notice, 7-day window,
        /// operating hours, and time-based capacity validation.
        /// </summary>
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

            // Business Rule: Updates require at least 12 hours' notice before current reservation date+time
            var reservationDateTime = reservation.ReservationDate.Date;
            if (TryParseTime(reservation.StartTime, out var resStart))
                reservationDateTime = reservationDateTime.Add(resStart.ToTimeSpan());

            if (reservationDateTime <= DateTime.UtcNow.AddHours(12))
            {
                return (false, "Updates require at least 12 hours' notice before the scheduled reservation.");
            }

            var updateBuilder = Builders<Reservation>.Update
                .Set(r => r.UpdatedAt, DateTime.UtcNow);

            var currentNodeId = !string.IsNullOrWhiteSpace(request.NodeId) ? request.NodeId : reservation.NodeId;
            var currentDate = request.ReservationDate?.Date ?? reservation.ReservationDate.Date;
            var currentStartTime = !string.IsNullOrWhiteSpace(request.StartTime) ? request.StartTime : reservation.StartTime;
            var currentEndTime = !string.IsNullOrWhiteSpace(request.EndTime) ? request.EndTime : reservation.EndTime;
            var currentEnergy = request.EnergyKWh ?? reservation.EnergyKWh;

            // ── Business Rule: Every energy reservation is exactly one hour ──
            if (!string.IsNullOrWhiteSpace(request.StartTime))
            {
                if (!TryParseTime(currentStartTime, out var newStart))
                    return (false, "Start time must be a valid time in HH:mm format.");

                var calcEnd = newStart.AddHours(1);
                currentEndTime = (calcEnd.Hour == 0 && newStart.Hour == 23) ? "24:00" : calcEnd.ToString("HH:mm");
                updateBuilder = updateBuilder
                    .Set(r => r.StartTime, currentStartTime)
                    .Set(r => r.EndTime, currentEndTime);
            }
            else if (!string.IsNullOrWhiteSpace(request.EndTime))
            {
                if (!TryParseTime(currentStartTime, out var sStart) || !TryParseTime(currentEndTime, out var sEnd))
                    return (false, "Start time and end time must be valid times in HH:mm format.");

                var duration = (sEnd.ToTimeSpan() - sStart.ToTimeSpan()).TotalMinutes;
                if (Math.Abs(duration - 60) > 1)
                    return (false, "Every energy reservation must be exactly one hour. Multi-hour reservations are not supported.");
            }

            // Validate node if changed
            if (!string.IsNullOrWhiteSpace(request.NodeId) && request.NodeId != reservation.NodeId)
            {
                var newNode = await _context.MicrogridNodes.Find(n => n.Id == request.NodeId).FirstOrDefaultAsync();
                if (newNode == null || !newNode.IsActive)
                    return (false, "New microgrid node not found or inactive.");
                updateBuilder = updateBuilder.Set(r => r.NodeId, request.NodeId);
            }

            if (request.ReservationDate.HasValue)
            {
                var newDate = request.ReservationDate.Value;

                // Validate new date is at least 12 hours in advance
                if (newDate.Date < DateTime.UtcNow.Date)
                    return (false, "New reservation date cannot be in the past.");

                // Validate new date is within 7 days
                if (newDate.Date > DateTime.UtcNow.AddDays(7).Date)
                    return (false, "New reservation date must be within the next 7 days.");

                updateBuilder = updateBuilder.Set(r => r.ReservationDate, newDate.Date);
            }

            if (!string.IsNullOrWhiteSpace(request.StartTime))
                updateBuilder = updateBuilder.Set(r => r.StartTime, request.StartTime);

            if (!string.IsNullOrWhiteSpace(request.EndTime))
                updateBuilder = updateBuilder.Set(r => r.EndTime, request.EndTime);

            if (request.EnergyKWh.HasValue)
            {
                if (request.EnergyKWh.Value <= 0)
                    return (false, "Energy amount must be greater than 0 kWh.");
                updateBuilder = updateBuilder.Set(r => r.EnergyKWh, request.EnergyKWh.Value);
            }

            // Check operating hours for the (potentially updated) time window
            var targetNode = await _context.MicrogridNodes.Find(n => n.Id == currentNodeId).FirstOrDefaultAsync();
            if (targetNode != null && !IsWithinOperatingHours(targetNode.Schedule, currentStartTime, currentEndTime))
            {
                return (false, $"Reservation time ({currentStartTime}–{currentEndTime}) falls outside station operating hours ({targetNode.Schedule}).");
            }

            // ── Lock per node to prevent race conditions ──
            var nodeLock = GetNodeLock(currentNodeId);
            await nodeLock.WaitAsync();
            try
            {
                // Check capacity for the new time window (excluding this reservation)
                var reservedKWh = await GetOverlappingReservedKWhAsync(
                    currentNodeId, currentDate, currentStartTime, currentEndTime, excludeReservationId: id);

                var slots = await _context.EnergySlots.Find(s => s.NodeId == currentNodeId).ToListAsync();
                var totalCapacity = slots
                    .Where(s => IsAvailableForWindow(s, currentDate, currentStartTime, currentEndTime))
                    .Sum(s => s.AvailableKWh);

                if (currentEnergy > totalCapacity - reservedKWh)
                {
                    return (false,
                        $"Insufficient capacity for {currentStartTime}–{currentEndTime} on {currentDate:yyyy-MM-dd}. " +
                        $"Available: {(totalCapacity - reservedKWh):0.##} kWh, Requested: {currentEnergy} kWh.");
                }

                if (request.SelectedSlotIds != null && request.SelectedSlotIds.Any())
                {
                    var allNodeSlots = await _context.EnergySlots.Find(s => s.NodeId == currentNodeId).ToListAsync();
                    var selectedSlots = allNodeSlots
                        .Where(s => !string.Equals(s.Status, "Maintenance", StringComparison.OrdinalIgnoreCase))
                        .Where(s => request.SelectedSlotIds.Contains(s.Id!))
                        .ToList();

                    if (selectedSlots.Count != request.SelectedSlotIds.Distinct().Count())
                    {
                        return (false, "One or more selected slots are invalid or under maintenance.");
                    }

                    var newEnergy = selectedSlots.Sum(s => s.AvailableKWh);
                    var newSlotNames = selectedSlots.OrderBy(s => s.SlotNumber).Select(s => $"Slot #{s.SlotNumber}").ToList();
                    updateBuilder = updateBuilder
                        .Set(r => r.AllocatedSlotIds, request.SelectedSlotIds)
                        .Set(r => r.AllocatedSlotNames, newSlotNames)
                        .Set(r => r.EnergyKWh, newEnergy);
                }
                else
                {
                    // Re-allocate slots for new parameters
                    var allocatedSlotIds = await AllocateSlotsAsync(
                        currentNodeId, currentDate, currentStartTime, currentEndTime, currentEnergy, excludeReservationId: id);
                    var reallocatedSlots = await _context.EnergySlots.Find(s => allocatedSlotIds.Contains(s.Id!)).ToListAsync();
                    var reallocatedNames = reallocatedSlots.OrderBy(s => s.SlotNumber).Select(s => $"Slot #{s.SlotNumber}").ToList();
                    updateBuilder = updateBuilder
                        .Set(r => r.AllocatedSlotIds, allocatedSlotIds)
                        .Set(r => r.AllocatedSlotNames, reallocatedNames);
                }

                var result = await _context.Reservations.UpdateOneAsync(
                    r => r.Id == id, updateBuilder);

                return result.ModifiedCount > 0
                    ? (true, "Reservation updated successfully.")
                    : (false, "No changes were made.");
            }
            finally
            {
                nodeLock.Release();
            }
        }

        // ────────────────────────────────────────────────────────────
        //  CANCEL RESERVATION
        // ────────────────────────────────────────────────────────────

        /// <summary>
        /// Cancels a reservation enforcing the 12-hour notice rule.
        /// Cancelled reservations no longer block capacity for their time window.
        /// </summary>
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
            var reservationDateTime = reservation.ReservationDate.Date;
            if (TryParseTime(reservation.StartTime, out var resStart))
                reservationDateTime = reservationDateTime.Add(resStart.ToTimeSpan());

            if (reservationDateTime <= DateTime.UtcNow.AddHours(12))
            {
                return (false, "Cancellations require at least 12 hours' notice before the reservation.");
            }

            var update = Builders<Reservation>.Update
                .Set(r => r.Status, "Cancelled")
                .Set(r => r.UpdatedAt, DateTime.UtcNow);

            var result = await _context.Reservations.UpdateOneAsync(
                r => r.Id == id, update);

            // No need to modify slot statuses or node counters — capacity is time-based.
            // The cancelled reservation will be excluded from future availability calculations
            // because its status is no longer "Pending" or "Approved".

            return result.ModifiedCount > 0
                ? (true, "Reservation cancelled successfully. Capacity has been released for that time window.")
                : (false, "Failed to cancel reservation.");
        }

        // ────────────────────────────────────────────────────────────
        //  APPROVE RESERVATION
        // ────────────────────────────────────────────────────────────

        /// <summary>
        /// Approves a pending reservation and generates a secure QR code string.
        /// No permanent slot/counter changes needed — capacity is time-based.
        /// </summary>
        public async Task<(bool Success, string Message)> ApproveAsync(string id)
        {
            var reservation = await GetByIdAsync(id);
            if (reservation == null)
                return (false, "Reservation not found.");

            if (!string.Equals(reservation.Status, "Pending", StringComparison.OrdinalIgnoreCase))
                return (false, $"Only pending reservations can be approved. Current status: {reservation.Status}.");

            // Verify microgrid node is still active
            var node = await _context.MicrogridNodes.Find(n => n.Id == reservation.NodeId).FirstOrDefaultAsync();
            if (node == null || !node.IsActive)
                return (false, "Microgrid node is unavailable or inactive.");

            // Verify capacity is still available for the time window
            var reservedKWh = await GetOverlappingReservedKWhAsync(
                reservation.NodeId, reservation.ReservationDate,
                reservation.StartTime, reservation.EndTime,
                excludeReservationId: id);

            var slots = await _context.EnergySlots.Find(s => s.NodeId == reservation.NodeId).ToListAsync();
            var totalCapacity = slots
                .Where(s => IsAvailableForWindow(s, reservation.ReservationDate, reservation.StartTime, reservation.EndTime))
                .Sum(s => s.AvailableKWh);

            if (reservation.EnergyKWh > totalCapacity - reservedKWh)
            {
                return (false,
                    $"Cannot approve: insufficient capacity for {reservation.StartTime}–{reservation.EndTime}. " +
                    $"Available: {(totalCapacity - reservedKWh):0.##} kWh, Required: {reservation.EnergyKWh} kWh.");
            }

            // Generate secure QR code data: SMTS-{reservationId}-{prosumerNic}-{guid}
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

        // ────────────────────────────────────────────────────────────
        //  COMPLETE RESERVATION (QR Verification)
        // ────────────────────────────────────────────────────────────

        /// <summary>
        /// Verifies QR code, marks reservation as completed.
        /// Completed reservations no longer block future capacity.
        /// </summary>
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

            // No need to modify slot statuses or node counters — capacity is time-based.
            // Completed reservations are excluded from availability calculations
            // because their status is no longer "Pending" or "Approved".

            return result.ModifiedCount > 0
                ? (true, "Energy transfer completed successfully.")
                : (false, "Failed to complete reservation.");
        }

        // ────────────────────────────────────────────────────────────
        //  PRIVATE HELPERS
        // ────────────────────────────────────────────────────────────

        /// <summary>
        /// Gets the total kWh reserved by active (Pending/Approved) reservations
        /// that overlap with the given time window on the given date.
        /// </summary>
        private async Task<double> GetOverlappingReservedKWhAsync(
            string nodeId, DateTime date, string startTime, string endTime,
            string? excludeReservationId = null)
        {
            var dateStart = date.Date;
            var dateEnd = dateStart.AddDays(1);

            var reservations = await _context.Reservations
                .Find(r => r.NodeId == nodeId &&
                           r.ReservationDate >= dateStart && r.ReservationDate < dateEnd &&
                           (r.Status == "Pending" || r.Status == "Approved"))
                .ToListAsync();

            return reservations
                .Where(r => excludeReservationId == null || r.Id != excludeReservationId)
                .Where(r => !string.IsNullOrEmpty(r.StartTime) && !string.IsNullOrEmpty(r.EndTime))
                .Where(r => TimesOverlap(r.StartTime, r.EndTime, startTime, endTime))
                .Sum(r => r.EnergyKWh);
        }

        /// <summary>
        /// Allocates battery slots using first-fit strategy.
        /// Returns list of allocated slot IDs.
        /// </summary>
        private async Task<List<string>> AllocateSlotsAsync(
            string nodeId, DateTime date, string startTime, string endTime,
            double requiredKWh, string? excludeReservationId = null)
        {
            // Get all non-maintenance slots for this node
            var allSlots = await _context.EnergySlots
                .Find(s => s.NodeId == nodeId)
                .ToListAsync();
            allSlots = allSlots
                .Where(s => IsAvailableForWindow(s, date, startTime, endTime))
                .ToList();

            // Get all active reservations that overlap with this time window
            var dateStart = date.Date;
            var dateEnd = dateStart.AddDays(1);
            var overlappingReservations = await _context.Reservations
                .Find(r => r.NodeId == nodeId &&
                           r.ReservationDate >= dateStart && r.ReservationDate < dateEnd &&
                           (r.Status == "Pending" || r.Status == "Approved"))
                .ToListAsync();

            overlappingReservations = overlappingReservations
                .Where(r => excludeReservationId == null || r.Id != excludeReservationId)
                .Where(r => !string.IsNullOrEmpty(r.StartTime) && !string.IsNullOrEmpty(r.EndTime))
                .Where(r => TimesOverlap(r.StartTime, r.EndTime, startTime, endTime))
                .ToList();

            // Find which slots are already allocated in overlapping reservations
            var occupiedSlotIds = overlappingReservations
                .SelectMany(r => r.AllocatedSlotIds ?? new List<string>())
                .ToHashSet();

            // Available slots = active slots NOT allocated in overlapping reservations
            var availableSlots = allSlots
                .Where(s => !occupiedSlotIds.Contains(s.Id!))
                .OrderByDescending(s => s.AvailableKWh) // Larger slots first for efficiency
                .ToList();

            // First-fit allocation
            var allocated = new List<string>();
            var remaining = requiredKWh;

            foreach (var slot in availableSlots)
            {
                if (remaining <= 0) break;
                allocated.Add(slot.Id!);
                remaining -= slot.AvailableKWh;
            }

            return allocated;
        }

        /// <summary>
        /// Checks if two time windows overlap.
        /// Times are in "HH:mm" format.
        /// Overlap: startA &lt; endB AND startB &lt; endA
        /// </summary>
        private static bool TimesOverlap(string startA, string endA, string startB, string endB)
        {
            if (!TryParseTime(startA, out var sA) || !TryParseTime(endA, out var eA) ||
                !TryParseTime(startB, out var sB) || !TryParseTime(endB, out var eB))
                return false;

            return sA < eB && sB < eA;
        }

        private static bool IsAvailableForWindow(EnergySlot slot, DateTime date, string startTime, string endTime)
        {
            if (!string.Equals(slot.Status, "Maintenance", StringComparison.OrdinalIgnoreCase))
                return true;

            // Legacy maintenance entries without a scheduled window remain unavailable
            // until an operator explicitly restores the slot.
            if (!slot.MaintenanceDate.HasValue ||
                string.IsNullOrWhiteSpace(slot.MaintenanceStartTime) ||
                string.IsNullOrWhiteSpace(slot.MaintenanceEndTime))
                return false;

            if (slot.MaintenanceDate.Value.Date != date.Date)
                return true;

            return !TimesOverlap(slot.MaintenanceStartTime, slot.MaintenanceEndTime, startTime, endTime);
        }

        /// <summary>
        /// Checks if a requested time window falls entirely within the station's operating hours.
        /// </summary>
        private static bool IsWithinOperatingHours(string? schedule, string startTime, string endTime)
        {
            if (string.IsNullOrWhiteSpace(schedule)) return true;

            try
            {
                var (open, close) = ParseSchedule(schedule);
                if (!TryParseTime(startTime, out var reqStart) || !TryParseTime(endTime, out var reqEnd))
                    return false;

                return reqStart >= open && reqEnd <= close;
            }
            catch
            {
                return true; // If schedule is malformed, don't block
            }
        }

        /// <summary>
        /// Parses a schedule string like "06:00-18:00" into open/close TimeOnly values.
        /// </summary>
        private static (TimeOnly Open, TimeOnly Close) ParseSchedule(string schedule)
        {
            var parts = schedule.Split('-', StringSplitOptions.TrimEntries);
            var open = TimeOnly.ParseExact(parts[0], "HH:mm", CultureInfo.InvariantCulture);
            var close = TimeOnly.ParseExact(parts[1], "HH:mm", CultureInfo.InvariantCulture);
            return (open, close);
        }

        /// <summary>
        /// Safely parses a time string in "HH:mm" format, also handling "24:00".
        /// </summary>
        private static bool TryParseTime(string? timeStr, out TimeOnly result)
        {
            result = default;
            if (string.IsNullOrWhiteSpace(timeStr)) return false;

            // Handle "24:00" as end-of-day
            if (timeStr.Trim() == "24:00")
            {
                result = new TimeOnly(23, 59);
                return true;
            }

            return TimeOnly.TryParseExact(timeStr.Trim(), "HH:mm",
                CultureInfo.InvariantCulture, DateTimeStyles.None, out result);
        }
    }
}
