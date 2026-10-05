package com.smartsolar.microgrid.ui.prosumer

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.ImageView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.smartsolar.microgrid.R
import com.smartsolar.microgrid.api.ApiClient
import com.smartsolar.microgrid.data.SessionManager
import com.smartsolar.microgrid.ui.auth.LoginActivity
import org.json.JSONObject

/**
 * Profile Activity
 *
 * Displays the currently logged-in prosumer's profile information.
 * Profile editing is handled separately by EditProfileActivity.
 * Allows changing account password and requesting account deactivation.
 */
class ProfileActivity : AppCompatActivity() {

    private lateinit var session: SessionManager

    private lateinit var tvProfileNic: TextView
    private lateinit var tvProfileStatus: TextView

    private lateinit var etProfFirstName: EditText
    private lateinit var etProfLastName: EditText
    private lateinit var etProfEmail: EditText
    private lateinit var etProfPhone: EditText
    private lateinit var etProfAddress: EditText

    private lateinit var etCurrentPassword: EditText
    private lateinit var etNewPassword: EditText
    private lateinit var etConfirmNewPassword: EditText
    private lateinit var btnChangePassword: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        session = SessionManager(this)

        setContentView(R.layout.activity_profile)

        // Initialize profile views
        tvProfileNic = findViewById(R.id.tvProfileNic)
        tvProfileStatus = findViewById(R.id.tvProfileStatus)

        etProfFirstName = findViewById(R.id.etProfFirstName)
        etProfLastName = findViewById(R.id.etProfLastName)
        etProfEmail = findViewById(R.id.etProfEmail)
        etProfPhone = findViewById(R.id.etProfPhone)
        etProfAddress = findViewById(R.id.etProfAddress)

        // Initialize change password views
        etCurrentPassword = findViewById(R.id.etCurrentPassword)
        etNewPassword = findViewById(R.id.etNewPassword)
        etConfirmNewPassword = findViewById(R.id.etConfirmNewPassword)
        btnChangePassword = findViewById(R.id.btnChangePassword)

        // Make Profile page view-only
        setProfileFieldsReadOnly()

        // Back navigation to Prosumer Dashboard
        findViewById<ImageView>(R.id.ivProfileBack).setOnClickListener {
            finish()
        }

        // Open Edit Profile screen
        findViewById<Button>(R.id.btnUpdateProfile).setOnClickListener {

            val intent = Intent(
                this@ProfileActivity,
                EditProfileActivity::class.java
            )

            startActivity(intent)
        }

        // Change Password action
        btnChangePassword.setOnClickListener {
            performChangePassword()
        }

        // Account deactivation
        findViewById<Button>(R.id.btnDeactivateAccount)
            .setOnClickListener {
                confirmDeactivation()
            }

        loadProfile()
    }

    /**
     * Reload profile whenever the user returns from EditProfileActivity.
     *
     * This ensures that newly updated information is displayed.
     */
    override fun onResume() {
        super.onResume()

        if (::session.isInitialized &&
            ::tvProfileNic.isInitialized
        ) {
            loadProfile()
        }
    }

    /**
     * Prevent profile fields from being edited directly on the
     * Profile screen.
     */
    private fun setProfileFieldsReadOnly() {

        val fields = listOf(
            etProfFirstName,
            etProfLastName,
            etProfEmail,
            etProfPhone,
            etProfAddress
        )

        fields.forEach { field ->
            field.isFocusable = false
            field.isFocusableInTouchMode = false
            field.isClickable = false
            field.isLongClickable = false
            field.isCursorVisible = false
        }
    }

    /**
     * Loads the current prosumer information from the central API.
     */
    private fun loadProfile() {

        val nic = session.getUserNic()

        if (nic.isBlank()) {

            Toast.makeText(
                this,
                "Unable to identify the logged-in prosumer.",
                Toast.LENGTH_LONG
            ).show()

            return
        }

        tvProfileNic.text = "NIC: $nic"

        ApiClient.request(
            "prosumer/$nic",
            "GET",
            null,
            session.getToken(),
            object : ApiClient.ApiCallback {

                override fun onSuccess(response: String) {

                    try {

                        val obj = JSONObject(response)

                        etProfFirstName.setText(
                            obj.optString("firstName", "")
                        )

                        etProfLastName.setText(
                            obj.optString("lastName", "")
                        )

                        etProfEmail.setText(
                            obj.optString("email", "")
                        )

                        etProfPhone.setText(
                            obj.optString("phone", "")
                        )

                        etProfAddress.setText(
                            obj.optString("address", "")
                        )

                        val status =
                            obj.optString("status", "Active")

                        tvProfileStatus.text =
                            "Status: $status"

                        when {

                            status.equals(
                                "Active",
                                ignoreCase = true
                            ) -> {

                                tvProfileStatus.setTextColor(
                                    ContextCompat.getColor(
                                        this@ProfileActivity,
                                        R.color.status_active
                                    )
                                )
                            }

                            status.equals(
                                "Pending",
                                ignoreCase = true
                            ) -> {

                                tvProfileStatus.setTextColor(
                                    ContextCompat.getColor(
                                        this@ProfileActivity,
                                        R.color.status_pending
                                    )
                                )
                            }

                            else -> {

                                tvProfileStatus.setTextColor(
                                    ContextCompat.getColor(
                                        this@ProfileActivity,
                                        R.color.status_cancelled
                                    )
                                )
                            }
                        }

                    } catch (e: Exception) {

                        Toast.makeText(
                            this@ProfileActivity,
                            "Unable to read profile information.",
                            Toast.LENGTH_SHORT
                        ).show()
                    }
                }

                override fun onError(error: String) {

                    Toast.makeText(
                        this@ProfileActivity,
                        "Unable to load profile: $error",
                        Toast.LENGTH_LONG
                    ).show()
                }
            }
        )
    }

    /**
     * Validates and submits the Change Password request to the central API.
     */
    private fun performChangePassword() {

        val currentPassword = etCurrentPassword.text.toString()
        val newPassword = etNewPassword.text.toString()
        val confirmNewPassword = etConfirmNewPassword.text.toString()

        etCurrentPassword.error = null
        etNewPassword.error = null
        etConfirmNewPassword.error = null

        if (currentPassword.isEmpty()) {
            etCurrentPassword.error = "Current password is required"
            etCurrentPassword.requestFocus()
            return
        }

        if (newPassword.isEmpty()) {
            etNewPassword.error = "New password is required"
            etNewPassword.requestFocus()
            return
        }

        if (newPassword.length < 6) {
            etNewPassword.error = "Password must be at least 6 characters"
            etNewPassword.requestFocus()
            return
        }

        if (confirmNewPassword.isEmpty()) {
            etConfirmNewPassword.error = "Confirm new password is required"
            etConfirmNewPassword.requestFocus()
            return
        }

        if (newPassword != confirmNewPassword) {
            etConfirmNewPassword.error = "Passwords do not match"
            etConfirmNewPassword.requestFocus()
            return
        }

        btnChangePassword.isEnabled = false
        btnChangePassword.text = "Updating..."

        try {
            val payload = JSONObject().apply {
                put("currentPassword", currentPassword)
                put("newPassword", newPassword)
            }

            ApiClient.request(
                "prosumer/password",
                "PATCH",
                payload,
                session.getToken(),
                object : ApiClient.ApiCallback {

                    override fun onSuccess(response: String) {
                        btnChangePassword.isEnabled = true
                        btnChangePassword.text = "Change Password"

                        etCurrentPassword.setText("")
                        etNewPassword.setText("")
                        etConfirmNewPassword.setText("")

                        Toast.makeText(
                            this@ProfileActivity,
                            "Password changed successfully.",
                            Toast.LENGTH_LONG
                        ).show()
                    }

                    override fun onError(error: String) {
                        btnChangePassword.isEnabled = true
                        btnChangePassword.text = "Change Password"

                        if (error.contains("incorrect", ignoreCase = true)) {
                            etCurrentPassword.error = "Current password is incorrect."
                            etCurrentPassword.requestFocus()
                            Toast.makeText(
                                this@ProfileActivity,
                                "Current password is incorrect.",
                                Toast.LENGTH_LONG
                            ).show()
                        } else {
                            Toast.makeText(
                                this@ProfileActivity,
                                error,
                                Toast.LENGTH_LONG
                            ).show()
                        }
                    }
                }
            )
        } catch (e: Exception) {
            btnChangePassword.isEnabled = true
            btnChangePassword.text = "Change Password"
            Toast.makeText(
                this,
                "Unable to change password: ${e.message}",
                Toast.LENGTH_LONG
            ).show()
        }
    }

    /**
     * Shows confirmation before deactivating the prosumer account.
     */
    private fun confirmDeactivation() {

        AlertDialog.Builder(this)
            .setTitle("Deactivate Account")
            .setMessage(
                "Are you sure you want to deactivate your prosumer account?\n\n" +
                        "Once deactivated, your active reservations will be frozen " +
                        "and reactivation requires a Backoffice Administrator."
            )
            .setPositiveButton(
                "Yes, Deactivate"
            ) { _, _ ->

                deactivateAccount()
            }
            .setNegativeButton(
                "Cancel",
                null
            )
            .show()
    }

    /**
     * Sends the account deactivation request to the central API.
     */
    private fun deactivateAccount() {

        val nic = session.getUserNic()

        ApiClient.request(
            "prosumer/$nic/deactivate",
            "PUT",
            null,
            session.getToken(),
            object : ApiClient.ApiCallback {

                override fun onSuccess(response: String) {

                    Toast.makeText(
                        this@ProfileActivity,
                        "Account deactivated. Logging out...",
                        Toast.LENGTH_LONG
                    ).show()

                    session.logout()

                    val intent = Intent(
                        this@ProfileActivity,
                        LoginActivity::class.java
                    )

                    intent.flags =
                        Intent.FLAG_ACTIVITY_NEW_TASK or
                                Intent.FLAG_ACTIVITY_CLEAR_TASK

                    startActivity(intent)

                    finish()
                }

                override fun onError(error: String) {

                    Toast.makeText(
                        this@ProfileActivity,
                        "Deactivation failed: $error",
                        Toast.LENGTH_LONG
                    ).show()
                }
            }
        )
    }
}