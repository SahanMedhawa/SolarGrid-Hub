package com.smartsolar.microgrid.utils

import android.content.Context

/**
 * Application-wide constants for API base URL and session keys.
 * Base URL is dynamically resolved by ServerDiscovery to ensure
 * zero-configuration operation for all developers on Emulators or physical devices.
 */
object Constants {
    const val DEFAULT_SERVER_PORT = "5000"

    // Dynamically resolved base URL
    @Volatile
    var BASE_URL = "http://127.0.0.1:$DEFAULT_SERVER_PORT/api/"

    // Preference Keys
    const val PREF_NAME = "SmartSolarPrefs"
    const val KEY_TOKEN = "jwt_token"
    const val KEY_USER_ID = "user_id"
    const val KEY_USER_NIC = "user_nic"
    const val KEY_USER_ROLE = "user_role"
    const val KEY_DISPLAY_NAME = "display_name"

    // Ensure the base URL is initialized and verified
    fun ensureBaseUrl(context: Context? = null): String {
        val host = ServerDiscovery.resolveServerHost(context)
        BASE_URL = "http://$host:$DEFAULT_SERVER_PORT/api/"
        return BASE_URL
    }

    // Force re-discovery if network changes or connection fails
    fun refreshBaseUrl(context: Context? = null): String {
        val host = ServerDiscovery.resolveServerHost(context, forceRefresh = true)
        BASE_URL = "http://$host:$DEFAULT_SERVER_PORT/api/"
        return BASE_URL
    }
}
