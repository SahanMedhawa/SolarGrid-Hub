package com.smartsolar.microgrid.data

import android.content.Context
import com.smartsolar.microgrid.utils.Constants

/**
 * Manages user authentication session and SharedPreferences.
 */
class SessionManager(context: Context) {

    private val pref = context.getSharedPreferences(Constants.PREF_NAME, Context.MODE_PRIVATE)
    private val editor = pref.edit()
    private val dbHelper = DatabaseHelper(context)

    // Create a new login session by storing credentials in SharedPreferences and SQLite
    fun createLoginSession(token: String, userId: String, nic: String, role: String, displayName: String) {
        editor.putString(Constants.KEY_TOKEN, token)
        editor.putString(Constants.KEY_USER_ID, userId)
        editor.putString(Constants.KEY_USER_NIC, nic)
        editor.putString(Constants.KEY_USER_ROLE, role)
        editor.putString(Constants.KEY_DISPLAY_NAME, displayName)
        editor.commit()

        // Also persist in local SQLite
        dbHelper.saveUser(userId, nic, displayName, role, token)
    }

    // Check if a valid session token exists
    fun isLoggedIn(): Boolean {
        return !getToken().isNullOrEmpty()
    }

    // Retrieve the JWT authentication token
    fun getToken(): String? {
        return pref.getString(Constants.KEY_TOKEN, null)
    }

    // Retrieve the logged-in user's NIC
    fun getUserNic(): String {
        return pref.getString(Constants.KEY_USER_NIC, "") ?: ""
    }

    // Retrieve the logged-in user's role
    fun getUserRole(): String {
        return pref.getString(Constants.KEY_USER_ROLE, "") ?: ""
    }

    // Retrieve the display name for the logged-in user
    fun getDisplayName(): String {
        return pref.getString(Constants.KEY_DISPLAY_NAME, "User") ?: "User"
    }

    // Clear the session and log the user out
    fun logout() {
        editor.clear()
        editor.commit()
        dbHelper.clearUser()
    }
}
