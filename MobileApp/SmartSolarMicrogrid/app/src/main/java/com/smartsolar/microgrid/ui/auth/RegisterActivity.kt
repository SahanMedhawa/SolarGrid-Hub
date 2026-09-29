package com.smartsolar.microgrid.ui.auth

import android.os.Bundle
import android.util.Patterns
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.smartsolar.microgrid.R
import com.smartsolar.microgrid.api.ApiClient
import org.json.JSONObject

/**
 * Registration Activity for new solar prosumers.
 * NIC is used as the unique identifier.
 * New registrations are submitted to the central API
 * and remain Pending until Backoffice activation.
 */
class RegisterActivity : AppCompatActivity() {

    private lateinit var etNic: EditText
    private lateinit var etFirstName: EditText
    private lateinit var etLastName: EditText
    private lateinit var etEmail: EditText
    private lateinit var etPhone: EditText
    private lateinit var etAddress: EditText
    private lateinit var etRegPassword: EditText
    private lateinit var btnSubmit: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_register)

        // Initialize views
        etNic = findViewById(R.id.etNic)
        etFirstName = findViewById(R.id.etFirstName)
        etLastName = findViewById(R.id.etLastName)
        etEmail = findViewById(R.id.etEmail)
        etPhone = findViewById(R.id.etPhone)
        etAddress = findViewById(R.id.etAddress)
        etRegPassword = findViewById(R.id.etRegPassword)
        btnSubmit = findViewById(R.id.btnSubmitRegister)

        btnSubmit.setOnClickListener {
            submitRegistration()
        }
    }

    /**
     * Validates registration data before sending it to the API.
     */
    private fun submitRegistration() {

        val nic = etNic.text.toString().trim().uppercase()
        val firstName = etFirstName.text.toString().trim()
        val lastName = etLastName.text.toString().trim()
        val email = etEmail.text.toString().trim()
        val phone = etPhone.text.toString().trim()
        val address = etAddress.text.toString().trim()
        val password = etRegPassword.text.toString()

        // Clear previous validation errors
        clearErrors()

        // ---------------------------------------------------------
        // NIC VALIDATION
        // New NIC format: 12 digits
        // Old NIC format: 9 digits followed by V or X
        // ---------------------------------------------------------

        val newNicRegex = Regex("^\\d{12}$")
        val oldNicRegex = Regex("^\\d{9}[VX]$")

        if (nic.isEmpty()) {
            etNic.error = "NIC is required"
            etNic.requestFocus()
            return
        }

        if (!newNicRegex.matches(nic) && !oldNicRegex.matches(nic)) {
            etNic.error =
                "Enter a valid Sri Lankan NIC (12 digits or 9 digits followed by V/X)"
            etNic.requestFocus()
            return
        }

        // ---------------------------------------------------------
        // FIRST NAME VALIDATION
        // ---------------------------------------------------------

        if (firstName.isEmpty()) {
            etFirstName.error = "First name is required"
            etFirstName.requestFocus()
            return
        }

        // ---------------------------------------------------------
        // LAST NAME VALIDATION
        // ---------------------------------------------------------

        if (lastName.isEmpty()) {
            etLastName.error = "Last name is required"
            etLastName.requestFocus()
            return
        }

        // ---------------------------------------------------------
        // EMAIL VALIDATION
        // ---------------------------------------------------------

        if (email.isEmpty()) {
            etEmail.error = "Email address is required"
            etEmail.requestFocus()
            return
        }

        if (!Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            etEmail.error = "Enter a valid email address"
            etEmail.requestFocus()
            return
        }

        // ---------------------------------------------------------
        // PHONE NUMBER VALIDATION
        // Accepts:
        // 0712345678
        // +94712345678
        // ---------------------------------------------------------

        val phoneRegex = Regex("^(?:\\+94|0)7\\d{8}$")

        if (phone.isEmpty()) {
            etPhone.error = "Mobile number is required"
            etPhone.requestFocus()
            return
        }

        if (!phoneRegex.matches(phone)) {
            etPhone.error =
                "Enter a valid Sri Lankan mobile number (e.g. 0712345678)"
            etPhone.requestFocus()
            return
        }

        // ---------------------------------------------------------
        // ADDRESS VALIDATION
        // ---------------------------------------------------------

        if (address.isEmpty()) {
            etAddress.error = "Physical address is required"
            etAddress.requestFocus()
            return
        }

        // ---------------------------------------------------------
        // PASSWORD VALIDATION
        // ---------------------------------------------------------

        if (password.isEmpty()) {
            etRegPassword.error = "Password is required"
            etRegPassword.requestFocus()
            return
        }

        if (password.length < 6) {
            etRegPassword.error =
                "Password must contain at least 6 characters"
            etRegPassword.requestFocus()
            return
        }

        // All client-side validation passed
        submitToApi(
            nic = nic,
            firstName = firstName,
            lastName = lastName,
            email = email,
            phone = phone,
            address = address,
            password = password
        )
    }

    /**
     * Clears validation errors from all registration fields.
     */
    private fun clearErrors() {
        etNic.error = null
        etFirstName.error = null
        etLastName.error = null
        etEmail.error = null
        etPhone.error = null
        etAddress.error = null
        etRegPassword.error = null
    }

    /**
     * Sends the validated registration information to the
     * centralized Web API.
     */
    private fun submitToApi(
        nic: String,
        firstName: String,
        lastName: String,
        email: String,
        phone: String,
        address: String,
        password: String
    ) {

        // Prevent duplicate submissions
        btnSubmit.isEnabled = false
        btnSubmit.text = "Submitting..."

        try {

            val payload = JSONObject().apply {
                put("nic", nic)
                put("firstName", firstName)
                put("lastName", lastName)
                put("email", email)
                put("phone", phone)
                put("address", address)
                put("password", password)
            }

            ApiClient.request(
                "prosumer/register",
                "POST",
                payload,
                null,
                object : ApiClient.ApiCallback {

                    override fun onSuccess(response: String) {

                        resetSubmitButton()

                        Toast.makeText(
                            this@RegisterActivity,
                            "Registration submitted successfully! Awaiting Backoffice activation.",
                            Toast.LENGTH_LONG
                        ).show()

                        // Return to login screen
                        finish()
                    }

                    override fun onError(error: String) {

                        resetSubmitButton()

                        Toast.makeText(
                            this@RegisterActivity,
                            error,
                            Toast.LENGTH_LONG
                        ).show()
                    }
                }
            )

        } catch (e: Exception) {

            resetSubmitButton()

            Toast.makeText(
                this,
                "Unable to submit registration: ${e.message}",
                Toast.LENGTH_LONG
            ).show()
        }
    }

    /**
     * Restores the registration button after the API request.
     */
    private fun resetSubmitButton() {
        btnSubmit.isEnabled = true
        btnSubmit.text = "Submit Registration"
    }
}