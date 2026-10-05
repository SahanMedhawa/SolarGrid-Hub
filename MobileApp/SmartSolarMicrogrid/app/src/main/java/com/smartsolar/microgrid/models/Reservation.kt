package com.smartsolar.microgrid.models

/**
 * Data model representing an Energy Slot Reservation.
 * Includes QR code data for secure transaction dispatch.
 */
data class Reservation(
    var id: String = "",
    var prosumerNic: String = "",
    var slotId: String = "",
    var nodeId: String = "",
    var reservationDate: String = "",
    var startTime: String = "",
    var endTime: String = "",
    var energyKWh: Double = 0.0,
    var status: String = "",
    var qrCodeData: String = "",
    var allocatedSlotIds: List<String> = emptyList(),
    var allocatedSlotNames: List<String> = emptyList()
)
