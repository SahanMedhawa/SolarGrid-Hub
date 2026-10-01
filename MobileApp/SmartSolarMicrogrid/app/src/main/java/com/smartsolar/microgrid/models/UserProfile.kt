package com.smartsolar.microgrid.models

import org.json.JSONObject

/**
 * Represents the logged-in staff user's own profile (Backoffice or Grid Operator).
 * Mirrors the fields returned by GET /api/profile on the central Web API.
 */
data class UserProfile(
    val id: String = "",
    val username: String = "",
    val email: String = "",
    val role: String = "",
    val isActive: Boolean = true,
    val createdAt: String = ""
) {
    companion object {
        fun fromJson(json: JSONObject): UserProfile {
            return UserProfile(
                id = json.optString("id"),
                username = json.optString("username"),
                email = json.optString("email"),
                role = json.optString("role"),
                isActive = json.optBoolean("isActive", true),
                createdAt = json.optString("createdAt")
            )
        }
    }
}