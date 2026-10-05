package com.smartsolar.microgrid.ui.operator

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.ImageButton
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import com.smartsolar.microgrid.R
import com.smartsolar.microgrid.api.ApiClient
import com.smartsolar.microgrid.data.SessionManager
import com.smartsolar.microgrid.models.UserProfile
import com.smartsolar.microgrid.ui.auth.LoginActivity
import org.json.JSONObject

/**
 * Self-service profile screen for any logged-in staff user
 * (Backoffice or GridOperator): view/update own info,
 * change password, or deactivate own account.
 */
class ProfileActivity : AppCompatActivity() {

    private val TAG = "ProfileActivity"
    private lateinit var session: SessionManager

    private lateinit var tvRoleStatus: TextView
    private lateinit var etUsername: EditText
    private lateinit var etEmail: EditText
    private lateinit var btnSaveProfile: Button

    private lateinit var etCurrentPassword: EditText
    private lateinit var etNewPassword: EditText
    private lateinit var etConfirmPassword: EditText
    private lateinit var btnChangePassword: Button

    private lateinit var btnDeactivateAccount: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        session = SessionManager(this)
        setContentView(R.layout.activity_operator_profile)

        tvRoleStatus = findViewById(R.id.tvRoleStatus)
        etUsername = findViewById(R.id.etUsername)
        etEmail = findViewById(R.id.etEmail)
        btnSaveProfile = findViewById(R.id.btnSaveProfile)

        etCurrentPassword = findViewById(R.id.etCurrentPassword)
        etNewPassword = findViewById(R.id.etNewPassword)
        etConfirmPassword = findViewById(R.id.etConfirmPassword)
        btnChangePassword = findViewById(R.id.btnChangePassword)

        btnDeactivateAccount = findViewById(R.id.btnDeactivateAccount)

        findViewById<ImageButton>(R.id.btnBack).setOnClickListener {
            finish() // returns to whichever dashboard (Backoffice or Operator) launched this screen
        }

        btnSaveProfile.setOnClickListener { handleUpdateProfile() }
        btnChangePassword.setOnClickListener { handleChangePassword() }
        btnDeactivateAccount.setOnClickListener { confirmDeactivate() }

        loadProfile()
    }

    // GET api/profile — load the logged-in user's own data
    private fun loadProfile() {
        ApiClient.request("profile", "GET", null, session.getToken(), object : ApiClient.ApiCallback {
            override fun onSuccess(response: String) {
                try {
                    val profile = UserProfile.fromJson(JSONObject(response))
                    etUsername.setText(profile.username)
                    etEmail.setText(profile.email)
                    tvRoleStatus.text = "Role: ${profile.role} · Status: ${if (profile.isActive) "Active" else "Deactivated"}"
                } catch (e: Exception) {
                    Toast.makeText(this@ProfileActivity, "Error parsing profile", Toast.LENGTH_SHORT).show()
                }
            }

            override fun onError(error: String) {
                Toast.makeText(this@ProfileActivity, "Failed to load profile: $error", Toast.LENGTH_SHORT).show()
            }
        })
    }

    // PUT api/profile — update username/email
    private fun handleUpdateProfile() {
        val username = etUsername.text.toString().trim()
        val email = etEmail.text.toString().trim()

        if (username.isEmpty()) {
            Toast.makeText(this, "Username cannot be empty", Toast.LENGTH_SHORT).show()
            return
        }

        if (email.isNotEmpty() && !android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            Toast.makeText(this, "Please enter a valid email address", Toast.LENGTH_SHORT).show()
            return
        }

        val payload = JSONObject().apply {
            put("username", username)
            put("email", email)
        }

        ApiClient.request("profile", "PUT", payload, session.getToken(), object : ApiClient.ApiCallback {
            override fun onSuccess(response: String) {
                Toast.makeText(this@ProfileActivity, "Profile updated successfully!", Toast.LENGTH_SHORT).show()
                loadProfile()
            }

            override fun onError(error: String) {
                Toast.makeText(this@ProfileActivity, "Update failed: $error", Toast.LENGTH_LONG).show()
            }
        })
    }

    // Validates password strength — must match backend rules exactly:
    // at least 8 characters, with uppercase, lowercase, a number, and a special character.
    private fun validatePassword(password: String): String? {
        if (password.isEmpty()) return "Password is required."
        if (password.length < 8) return "Password must be at least 8 characters long."
        if (!password.any { it.isUpperCase() }) return "Password must contain at least one uppercase letter."
        if (!password.any { it.isLowerCase() }) return "Password must contain at least one lowercase letter."
        if (!password.any { it.isDigit() }) return "Password must contain at least one number."
        val specialChars = "!@#\$%^&*()_+-=[]{}|;:,.<>?"
        if (!password.any { it in specialChars }) return "Password must contain at least one special character (e.g. ! @ # $ % ^ & *)."
        return null
    }

    // PATCH api/profile/password — change own password
    private fun handleChangePassword() {
        val current = etCurrentPassword.text.toString().trim()
        val newPass = etNewPassword.text.toString().trim()
        val confirm = etConfirmPassword.text.toString().trim()

        if (current.isEmpty()) {
            Toast.makeText(this, "Please enter your current password", Toast.LENGTH_SHORT).show()
            return
        }

        val validationError = validatePassword(newPass)
        if (validationError != null) {
            Toast.makeText(this, validationError, Toast.LENGTH_LONG).show()
            return
        }

        if (newPass != confirm) {
            Toast.makeText(this, "New passwords do not match", Toast.LENGTH_SHORT).show()
            return
        }

        if (newPass == current) {
            Toast.makeText(this, "New password must be different from current password", Toast.LENGTH_SHORT).show()
            return
        }

        val payload = JSONObject().apply {
            put("currentPassword", current)
            put("newPassword", newPass)
        }

        ApiClient.request("profile/password", "PATCH", payload, session.getToken(), object : ApiClient.ApiCallback {
            override fun onSuccess(response: String) {
                Toast.makeText(this@ProfileActivity, "Password changed successfully!", Toast.LENGTH_SHORT).show()
                etCurrentPassword.setText("")
                etNewPassword.setText("")
                etConfirmPassword.setText("")
            }

            override fun onError(error: String) {
                Toast.makeText(this@ProfileActivity, "Failed: $error", Toast.LENGTH_LONG).show()
            }
        })
    }

    // DELETE api/profile — deactivate own account, then force logout
    private fun confirmDeactivate() {
        AlertDialog.Builder(this)
            .setTitle("Deactivate Account")
            .setMessage("Are you sure you want to deactivate your own account? You will be logged out immediately. A Backoffice officer can reactivate it later.")
            .setPositiveButton("Deactivate") { _, _ -> handleDeactivate() }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun handleDeactivate() {
        ApiClient.request("profile", "DELETE", null, session.getToken(), object : ApiClient.ApiCallback {
            override fun onSuccess(response: String) {
                Toast.makeText(this@ProfileActivity, "Account deactivated.", Toast.LENGTH_SHORT).show()
                session.logout()
                val intent = Intent(this@ProfileActivity, LoginActivity::class.java)
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                startActivity(intent)
                finish()
            }

            override fun onError(error: String) {
                Toast.makeText(this@ProfileActivity, "Failed: $error", Toast.LENGTH_LONG).show()
            }
        })
    }
}