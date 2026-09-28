package com.smartsolar.microgrid.ui.prosumer

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
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
 * Profile Activity - allows prosumers to view/edit their profile data
 * and request account deactivation via the central Web API.
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

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        session = SessionManager(this)
        setContentView(R.layout.activity_profile)

        tvProfileNic = findViewById(R.id.tvProfileNic)
        tvProfileStatus = findViewById(R.id.tvProfileStatus)
        etProfFirstName = findViewById(R.id.etProfFirstName)
        etProfLastName = findViewById(R.id.etProfLastName)
        etProfEmail = findViewById(R.id.etProfEmail)
        etProfPhone = findViewById(R.id.etProfPhone)
        etProfAddress = findViewById(R.id.etProfAddress)

        findViewById<Button>(R.id.btnUpdateProfile).setOnClickListener { updateProfile() }
        findViewById<Button>(R.id.btnDeactivateAccount).setOnClickListener { confirmDeactivation() }

        loadProfile()
    }

    // Load prosumer profile data from central API
    private fun loadProfile() {
        val nic = session.getUserNic()
        tvProfileNic.text = "NIC: $nic"

        ApiClient.request("prosumer/$nic", "GET", null, session.getToken(), object : ApiClient.ApiCallback {
            override fun onSuccess(response: String) {
                try {
                    val obj = JSONObject(response)
                    etProfFirstName.setText(obj.optString("firstName", ""))
                    etProfLastName.setText(obj.optString("lastName", ""))
                    etProfEmail.setText(obj.optString("email", ""))
                    etProfPhone.setText(obj.optString("phone", ""))
                    etProfAddress.setText(obj.optString("address", ""))

                    val status = obj.optString("status", "Active")
                    tvProfileStatus.text = "Status: $status"
                    if (status.equals("Active", ignoreCase = true)) {
                        tvProfileStatus.setTextColor(ContextCompat.getColor(this@ProfileActivity, R.color.status_active))
                    } else {
                        tvProfileStatus.setTextColor(ContextCompat.getColor(this@ProfileActivity, R.color.status_cancelled))
                    }
                } catch (_: Exception) { }
            }

            override fun onError(error: String) {
                Toast.makeText(this@ProfileActivity, error, Toast.LENGTH_SHORT).show()
            }
        })
    }

    // Update prosumer's profile data via API
    private fun updateProfile() {
        val firstName = etProfFirstName.text.toString().trim()
        val lastName = etProfLastName.text.toString().trim()
        val email = etProfEmail.text.toString().trim()
        val phone = etProfPhone.text.toString().trim()
        val address = etProfAddress.text.toString().trim()

        if (firstName.isEmpty() || lastName.isEmpty() || email.isEmpty() || phone.isEmpty() || address.isEmpty()) {
            Toast.makeText(this, "Please fill in all profile fields", Toast.LENGTH_SHORT).show()
            return
        }

        try {
            val body = JSONObject().apply {
                put("firstName", firstName)
                put("lastName", lastName)
                put("email", email)
                put("phone", phone)
                put("address", address)
            }

            ApiClient.request("prosumer/${session.getUserNic()}", "PUT", body, session.getToken(), object : ApiClient.ApiCallback {
                override fun onSuccess(response: String) {
                    Toast.makeText(this@ProfileActivity, "Profile updated successfully! ✅", Toast.LENGTH_SHORT).show()
                }

                override fun onError(error: String) {
                    Toast.makeText(this@ProfileActivity, "Update failed: $error", Toast.LENGTH_LONG).show()
                }
            })
        } catch (e: Exception) {
            Toast.makeText(this, "Error building request: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    // Confirm and request account deactivation via API
    private fun confirmDeactivation() {
        AlertDialog.Builder(this)
            .setTitle("Deactivate Account")
            .setMessage("Are you sure you want to deactivate your prosumer account?\n\nOnce deactivated, your active reservations will be frozen and reactivation requires a Backoffice officer.")
            .setPositiveButton("Yes, Deactivate") { _, _ ->
                ApiClient.request(
                    "prosumer/${session.getUserNic()}/deactivate", "PUT", null,
                    session.getToken(), object : ApiClient.ApiCallback {
                        override fun onSuccess(response: String) {
                            Toast.makeText(
                                this@ProfileActivity,
                                "Account deactivated. Logging out...",
                                Toast.LENGTH_LONG
                            ).show()
                            session.logout()
                            val intent = Intent(this@ProfileActivity, LoginActivity::class.java)
                            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                            startActivity(intent)
                            finish()
                        }

                        override fun onError(error: String) {
                            Toast.makeText(this@ProfileActivity, error, Toast.LENGTH_LONG).show()
                        }
                    })
            }
            .setNegativeButton("Cancel", null)
            .show()
    }
}
