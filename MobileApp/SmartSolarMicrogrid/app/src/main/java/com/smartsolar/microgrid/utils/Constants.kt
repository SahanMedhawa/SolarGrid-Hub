package com.smartsolar.microgrid.utils

import android.content.Context

/**
 * Application-wide constants for API base URL and SharedPreferences keys.
 * Uses the local machine IP on the shared Wi-Fi network for physical devices,
 * with fallback support for Android Emulator (10.0.2.2) and ADB reverse (localhost).
 */
object Constants {
    // Current PC IPv4 on Wi-Fi network (accessible by physical devices on same Wi-Fi)
    const val DEFAULT_SERVER_HOST = "192.168.244.93"
    const val DEFAULT_SERVER_PORT = "5000"

    // Default base URL pointing to the PC's Wi-Fi IP
    var BASE_URL = "http://$DEFAULT_SERVER_HOST:$DEFAULT_SERVER_PORT/api/"

    // Preference Keys
    const val PREF_NAME = "SmartSolarPrefs"
    const val KEY_SERVER_IP = "server_ip"
    const val KEY_TOKEN = "jwt_token"
    const val KEY_USER_ID = "user_id"
    const val KEY_USER_NIC = "user_nic"
    const val KEY_USER_ROLE = "user_role"
    const val KEY_DISPLAY_NAME = "display_name"

    // Initialize or refresh the base URL from saved preferences
    fun initBaseUrl(context: Context) {
        val pref = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        val savedHost = pref.getString(KEY_SERVER_IP, DEFAULT_SERVER_HOST) ?: DEFAULT_SERVER_HOST
        BASE_URL = "http://$savedHost:$DEFAULT_SERVER_PORT/api/"
    }

    // Save a new server host IP
    fun setServerHost(context: Context, host: String) {
        val cleanHost = host.trim().removePrefix("http://").removePrefix("https://").split(":")[0]
        val pref = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        pref.edit().putString(KEY_SERVER_IP, cleanHost).apply()
        BASE_URL = "http://$cleanHost:$DEFAULT_SERVER_PORT/api/"
    }

    // Get currently active server host
    fun getServerHost(context: Context): String {
        val pref = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        return pref.getString(KEY_SERVER_IP, DEFAULT_SERVER_HOST) ?: DEFAULT_SERVER_HOST
    }
}
