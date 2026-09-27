package com.smartsolar.microgrid.models

/**
 * Data model representing a Microgrid Node (solar grid hub).
 * Contains GPS location, capacity specs, battery storage slots, and schedule info.
 */
data class MicrogridNode(
    var id: String = "",
    var nodeName: String = "",
    var location: String = "",
    var latitude: Double = 0.0,
    var longitude: Double = 0.0,
    var capacityKWh: Double = 0.0,
    var batterySlots: Int = 0,
    var availableBatterySlots: Int = 0,
    var schedule: String = "",
    var isActive: Boolean = false
)
