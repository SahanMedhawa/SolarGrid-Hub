// ============================================================
// File: IReservationService.cs
// Project: SmartSolarMicrogridAPI
// Description: Interface for energy reservation management
//              with time-window-based capacity evaluation.
// ============================================================

using SmartSolarMicrogridAPI.Models;
using SmartSolarMicrogridAPI.Models.DTOs;

namespace SmartSolarMicrogridAPI.Services
{
    /// <summary>
    /// Defines operations for managing energy reservations.
    /// </summary>
    public interface IReservationService
    {
        // Retrieves all reservations.
        Task<List<Reservation>> GetAllAsync();

        // Retrieves a reservation by ID.
        Task<Reservation?> GetByIdAsync(string id);

        // Retrieves reservations for a specific prosumer.
        Task<List<Reservation>> GetByProsumerNicAsync(string nic);

        // Retrieves reservations by status.
        Task<List<Reservation>> GetByStatusAsync(string status);

        // Gets the count of approved future reservations for a prosumer.
        Task<long> GetApprovedFutureCountAsync(string nic);

        // Gets the count of pending reservations for a prosumer.
        Task<long> GetPendingCountByProsumerAsync(string nic);

        // Gets availability for a specific station, date, and time window.
        Task<AvailabilityResponse> GetAvailabilityAsync(string nodeId, DateTime date, string startTime, string endTime);

        // Gets hourly availability breakdown for a station on a specific date.
        Task<HourlyAvailabilityResponse> GetHourlyAvailabilityAsync(string nodeId, DateTime date);

        // Creates a new reservation (must be within 7 days, within operating hours, capacity available).
        Task<(bool Success, string Message, Reservation? Reservation)> CreateAsync(CreateReservationRequest request);

        // Updates a reservation (requires 12 hours' notice).
        Task<(bool Success, string Message)> UpdateAsync(string id, UpdateReservationRequest request);

        // Cancels a reservation (requires 12 hours' notice).
        Task<(bool Success, string Message)> CancelAsync(string id);

        // Approves a reservation and generates QR code.
        Task<(bool Success, string Message)> ApproveAsync(string id);

        // Finalizes a reservation as completed (operator verification).
        Task<(bool Success, string Message)> CompleteAsync(string id, string qrData);
    }
}
