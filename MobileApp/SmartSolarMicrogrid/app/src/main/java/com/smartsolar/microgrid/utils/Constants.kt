package com.smartsolar.microgrid.utils

/**
 * Application-wide constants for API base URL and SharedPreferences keys.
 * When testing on Android Emulator, 10.0.2.2 maps to Windows Host localhost.
 */
object Constants {
    // When testing on Android Emulator, 10.0.2.2 maps to Windows Host localhost
    const val BASE_URL = "http://10.0.2.2:5000/api/"

    // Preference Keys
    const val PREF_NAME = "SmartSolarPrefs"
    const val KEY_TOKEN = "jwt_token"
    const val KEY_USER_ID = "user_id"
    const val KEY_USER_NIC = "user_nic"
    const val KEY_USER_ROLE = "user_role"
    const val KEY_DISPLAY_NAME = "display_name"
}
