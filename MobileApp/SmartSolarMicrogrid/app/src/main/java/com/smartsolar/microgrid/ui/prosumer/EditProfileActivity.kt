package com.smartsolar.microgrid.ui.prosumer

import android.os.Bundle
import android.util.Patterns
import android.widget.Button
import android.widget.EditText
import android.widget.ImageView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.smartsolar.microgrid.R
import com.smartsolar.microgrid.api.ApiClient
import com.smartsolar.microgrid.data.SessionManager
import org.json.JSONObject

class EditProfileActivity : AppCompatActivity() {

    private lateinit var session: SessionManager

    private lateinit var tvEditProfileNic: TextView

    private lateinit var etEditFirstName: EditText
    private lateinit var etEditLastName: EditText
    private lateinit var etEditEmail: EditText
    private lateinit var etEditPhone: EditText
    private lateinit var etEditAddress: EditText

    private lateinit var btnSaveProfile: Button
    private lateinit var btnCancelEdit: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_edit_profile)

        session = SessionManager(this)

        // Initialize views
        tvEditProfileNic = findViewById(R.id.tvEditProfileNic)

        etEditFirstName = findViewById(R.id.etEditFirstName)
        etEditLastName = findViewById(R.id.etEditLastName)
        etEditEmail = findViewById(R.id.etEditEmail)
        etEditPhone = findViewById(R.id.etEditPhone)
        etEditAddress = findViewById(R.id.etEditAddress)

        btnSaveProfile = findViewById(R.id.btnSaveProfile)
        btnCancelEdit = findViewById(R.id.btnCancelEdit)

        // Load current profile information
        loadProfile()

        // Save only when the user explicitly presses Save Changes
        btnSaveProfile.setOnClickListener {
            validateAndUpdateProfile()
        }

        // Back navigation to Profile
        findViewById<ImageView>(R.id.ivEditProfileBack).setOnClickListener {
            finish()
        }

        // Return to Profile without making changes
        btnCancelEdit.setOnClickListener {
            finish()
        }
    }

    /**
     * Loads the current prosumer profile from the central API
     * and fills the edit form.
     */
    private fun loadProfile() {

        val nic = session.getUserNic()

        if (nic.isBlank()) {
            Toast.makeText(
                this,
                "Unable to identify the logged-in prosumer.",
                Toast.LENGTH_LONG
            ).show()

            finish()
            return
        }

        tvEditProfileNic.text = "NIC: $nic"

        setFormEnabled(false)

        ApiClient.request(
            "prosumer/$nic",
            "GET",
            null,
            session.getToken(),
            object : ApiClient.ApiCallback {

                override fun onSuccess(response: String) {

                    try {

                        val obj = JSONObject(response)

                        etEditFirstName.setText(
                            obj.optString("firstName", "")
                        )

                        etEditLastName.setText(
                            obj.optString("lastName", "")
                        )

                        etEditEmail.setText(
                            obj.optString("email", "")
                        )

                        etEditPhone.setText(
                            obj.optString("phone", "")
                        )

                        etEditAddress.setText(
                            obj.optString("address", "")
                        )

                        setFormEnabled(true)

                    } catch (e: Exception) {

                        setFormEnabled(true)

                        Toast.makeText(
                            this@EditProfileActivity,
                            "Unable to load profile information.",
                            Toast.LENGTH_LONG
                        ).show()
                    }
                }

                override fun onError(error: String) {

                    setFormEnabled(true)

                    Toast.makeText(
                        this@EditProfileActivity,
                        "Failed to load profile: $error",
                        Toast.LENGTH_LONG
                    ).show()
                }
            }
        )
    }

    /**
     * Validates all editable fields before sending the update.
     */
    private fun validateAndUpdateProfile() {

        clearErrors()

        val firstName =
            etEditFirstName.text.toString().trim()

        val lastName =
            etEditLastName.text.toString().trim()

        val email =
            etEditEmail.text.toString().trim()

        val phone =
            etEditPhone.text.toString().trim()

        val address =
            etEditAddress.text.toString().trim()

        // First name validation
        if (firstName.isEmpty()) {
            etEditFirstName.error = "First name is required"
            etEditFirstName.requestFocus()
            return
        }

        // Last name validation
        if (lastName.isEmpty()) {
            etEditLastName.error = "Last name is required"
            etEditLastName.requestFocus()
            return
        }

        // Email validation
        if (email.isEmpty()) {
            etEditEmail.error = "Email address is required"
            etEditEmail.requestFocus()
            return
        }

        if (!Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            etEditEmail.error = "Enter a valid email address"
            etEditEmail.requestFocus()
            return
        }

        // Sri Lankan mobile validation
        // Examples:
        // 0712345678
        // +94712345678
        val phoneRegex = Regex("^(?:\\+94|0)7\\d{8}$")

        if (phone.isEmpty()) {
            etEditPhone.error = "Mobile number is required"
            etEditPhone.requestFocus()
            return
        }

        if (!phoneRegex.matches(phone)) {
            etEditPhone.error =
                "Enter a valid Sri Lankan mobile number (e.g. 0712345678)"
            etEditPhone.requestFocus()
            return
        }

        // Address validation
        if (address.isEmpty()) {
            etEditAddress.error = "Physical address is required"
            etEditAddress.requestFocus()
            return
        }

        updateProfile(
            firstName,
            lastName,
            email,
            phone,
            address
        )
    }

    /**
     * Sends the updated profile information to the central API.
     */
    private fun updateProfile(
        firstName: String,
        lastName: String,
        email: String,
        phone: String,
        address: String
    ) {

        val nic = session.getUserNic()

        btnSaveProfile.isEnabled = false
        btnSaveProfile.text = "Saving..."

        try {

            val body = JSONObject().apply {
                put("firstName", firstName)
                put("lastName", lastName)
                put("email", email)
                put("phone", phone)
                put("address", address)
            }

            ApiClient.request(
                "prosumer/$nic",
                "PUT",
                body,
                session.getToken(),
                object : ApiClient.ApiCallback {

                    override fun onSuccess(response: String) {

                        resetSaveButton()

                        Toast.makeText(
                            this@EditProfileActivity,
                            "Profile updated successfully! ✅",
                            Toast.LENGTH_SHORT
                        ).show()

                        // Close Edit Profile and return to Profile
                        finish()
                    }

                    override fun onError(error: String) {

                        resetSaveButton()

                        Toast.makeText(
                            this@EditProfileActivity,
                            "Update failed: $error",
                            Toast.LENGTH_LONG
                        ).show()
                    }
                }
            )

        } catch (e: Exception) {

            resetSaveButton()

            Toast.makeText(
                this,
                "Unable to update profile: ${e.message}",
                Toast.LENGTH_LONG
            ).show()
        }
    }

    /**
     * Clears previous field validation errors.
     */
    private fun clearErrors() {
        etEditFirstName.error = null
        etEditLastName.error = null
        etEditEmail.error = null
        etEditPhone.error = null
        etEditAddress.error = null
    }

    /**
     * Enables/disables the form while profile data is loading.
     */
    private fun setFormEnabled(enabled: Boolean) {
        etEditFirstName.isEnabled = enabled
        etEditLastName.isEnabled = enabled
        etEditEmail.isEnabled = enabled
        etEditPhone.isEnabled = enabled
        etEditAddress.isEnabled = enabled
        btnSaveProfile.isEnabled = enabled
    }

    /**
     * Restores the Save button after an API request.
     */
    private fun resetSaveButton() {
        btnSaveProfile.isEnabled = true
        btnSaveProfile.text = "Save Changes  →"
    }
}