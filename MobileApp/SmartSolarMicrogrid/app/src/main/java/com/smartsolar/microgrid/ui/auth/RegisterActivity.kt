package com.smartsolar.microgrid.ui.auth

import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.smartsolar.microgrid.R
import com.smartsolar.microgrid.api.ApiClient
import org.json.JSONObject

/**
 * Registration Activity - allows new solar prosumers to register using
 * their NIC (National Identity Card) as the primary key.
 * Registration data is sent to the central Web API for Backoffice activation.
 */
class RegisterActivity : AppCompatActivity() {

    private lateinit var etNic: EditText
    private lateinit var etFirstName: EditText
    private lateinit var etLastName: EditText
    private lateinit var etEmail: EditText
    private lateinit var etPhone: EditText
    private lateinit var etAddress: EditText
    private lateinit var etRegPassword: EditText

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_register)

        etNic = findViewById(R.id.etNic)
        etFirstName = findViewById(R.id.etFirstName)
        etLastName = findViewById(R.id.etLastName)
        etEmail = findViewById(R.id.etEmail)
        etPhone = findViewById(R.id.etPhone)
        etAddress = findViewById(R.id.etAddress)
        etRegPassword = findViewById(R.id.etRegPassword)
        val btnSubmit: Button = findViewById(R.id.btnSubmitRegister)

        btnSubmit.setOnClickListener { submitRegistration() }
    }

    // Validate all fields and submit prosumer registration to the central API
    private fun submitRegistration() {
        val nic = etNic.text.toString().trim()
        val firstName = etFirstName.text.toString().trim()
        val lastName = etLastName.text.toString().trim()
        val email = etEmail.text.toString().trim()
        val phone = etPhone.text.toString().trim()
        val address = etAddress.text.toString().trim()
        val password = etRegPassword.text.toString().trim()

        if (nic.isEmpty() || firstName.isEmpty() || lastName.isEmpty() ||
            email.isEmpty() || phone.isEmpty() || address.isEmpty() || password.isEmpty()
        ) {
            Toast.makeText(this, "Please fill all required fields", Toast.LENGTH_SHORT).show()
            return
        }

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

            ApiClient.request("prosumer/register", "POST", payload, null, object : ApiClient.ApiCallback {
                override fun onSuccess(response: String) {
                    Toast.makeText(
                        this@RegisterActivity,
                        "Registration submitted! Awaiting Backoffice activation.",
                        Toast.LENGTH_LONG
                    ).show()
                    finish()
                }

                override fun onError(error: String) {
                    Toast.makeText(this@RegisterActivity, error, Toast.LENGTH_LONG).show()
                }
            })
        } catch (e: Exception) {
            Toast.makeText(this, "Request error", Toast.LENGTH_SHORT).show()
        }
    }
}
