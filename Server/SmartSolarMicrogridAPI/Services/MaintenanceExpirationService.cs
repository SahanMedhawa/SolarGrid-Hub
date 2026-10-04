using Microsoft.Extensions.Hosting;
using MongoDB.Driver;
using SmartSolarMicrogridAPI.Data;
using SmartSolarMicrogridAPI.Models;

namespace SmartSolarMicrogridAPI.Services
{
    /// <summary>
    /// Returns scheduled maintenance slots to service after their maintenance window ends.
    /// </summary>
    public sealed class MaintenanceExpirationService : BackgroundService
    {
        private readonly MongoDbContext _context;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<MaintenanceExpirationService> _logger;

        public MaintenanceExpirationService(
            MongoDbContext context,
            IServiceScopeFactory scopeFactory,
            ILogger<MaintenanceExpirationService> logger)
        {
            _context = context;
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await RestoreExpiredSlotsAsync(stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to restore expired maintenance slots.");
                }

                await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
            }
        }

        private async Task RestoreExpiredSlotsAsync(CancellationToken stoppingToken)
        {
            var maintenanceSlots = await _context.EnergySlots
                .Find(slot => slot.Status == "Maintenance" && slot.MaintenanceDate != null)
                .ToListAsync(stoppingToken);

            var now = DateTime.Now;
            var restoredNodeIds = new HashSet<string>();

            foreach (var slot in maintenanceSlots)
            {
                if (string.IsNullOrWhiteSpace(slot.MaintenanceEndTime) ||
                    !TryGetMaintenanceEnd(MaintenanceDateHelper.ToCalendarDate(slot.MaintenanceDate!.Value), slot.MaintenanceEndTime, out var maintenanceEnd) ||
                    maintenanceEnd > now)
                {
                    continue;
                }

                var update = Builders<EnergySlot>.Update
                    .Set(item => item.Status, "Available")
                    .Unset(item => item.MaintenanceDate)
                    .Unset(item => item.MaintenanceStartTime)
                    .Unset(item => item.MaintenanceEndTime);
                var filter = Builders<EnergySlot>.Filter.Where(item =>
                    item.Id == slot.Id &&
                    item.Status == "Maintenance" &&
                    item.MaintenanceDate == slot.MaintenanceDate &&
                    item.MaintenanceEndTime == slot.MaintenanceEndTime);

                var result = await _context.EnergySlots.UpdateOneAsync(filter, update, cancellationToken: stoppingToken);
                if (result.ModifiedCount > 0)
                {
                    restoredNodeIds.Add(slot.NodeId);
                    _logger.LogInformation("Automatically restored energy slot {SlotId} after maintenance ended.", slot.Id);
                }
            }

            if (restoredNodeIds.Count == 0) return;

            using var scope = _scopeFactory.CreateScope();
            var nodeService = scope.ServiceProvider.GetRequiredService<IMicrogridNodeService>();
            foreach (var nodeId in restoredNodeIds)
            {
                await nodeService.SyncNodeCapacityAsync(nodeId);
            }
        }

        private static bool TryGetMaintenanceEnd(DateTime maintenanceDate, string endTime, out DateTime end)
        {
            if (string.Equals(endTime.Trim(), "24:00", StringComparison.Ordinal))
            {
                end = maintenanceDate.Date.AddDays(1);
                return true;
            }

            if (TimeOnly.TryParseExact(
                endTime,
                "HH:mm",
                System.Globalization.CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.None,
                out var parsedEnd))
            {
                end = DateTime.SpecifyKind(maintenanceDate.Date, DateTimeKind.Unspecified).Add(parsedEnd.ToTimeSpan());
                return true;
            }

            end = default;
            return false;
        }
    }
}
