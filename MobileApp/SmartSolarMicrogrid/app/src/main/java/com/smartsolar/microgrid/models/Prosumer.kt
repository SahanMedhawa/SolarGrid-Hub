package com.smartsolar.microgrid.models

/**
 * Data model representing a Solar Prosumer profile.
 * Uses NIC (National Identity Card) as the primary key.
 */
data class Prosumer(
    var id: String = "",
    var nic: String = "",
    var firstName: String = "",
    var lastName: String = "",
    var email: String = "",
    var phone: String = "",
    var address: String = "",
    var status: String = ""
)
