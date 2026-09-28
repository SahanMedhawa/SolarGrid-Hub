package com.smartsolar.microgrid.ui.auth

import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.widget.Button
import android.widget.EditText
import android.widget.RadioButton
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import com.smartsolar.microgrid.R
import com.smartsolar.microgrid.api.ApiClient
import com.smartsolar.microgrid.data.SessionManager
import com.smartsolar.microgrid.ui.backoffice.BackofficeMainActivity
import com.smartsolar.microgrid.ui.operator.OperatorMainActivity
import com.smartsolar.microgrid.ui.prosumer.ProsumerMainActivity
import com.smartsolar.microgrid.utils.Constants
import org.json.JSONObject

/**
 * Login Activity - handles user authentication via the central Web API.
 * Routes users to role-specific dashboards (Prosumer, Operator, Backoffice).
 * Supports dynamic server IP configuration for physical devices and emulators.
 */
class LoginActivity : AppCompatActivity() {

    private val TAG = "LoginActivity"
    private lateinit var etUsername: EditText
    private lateinit var etPassword: EditText
    private lateinit var rbProsumer: RadioButton
    private lateinit var btnServerConfig: Button
    private lateinit var session: SessionManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        session = SessionManager(this)

        // Initialize API Base URL from preferences
        Constants.initBaseUrl(this)

        // Check if session already exists
        if (session.isLoggedIn()) {
            navigateByRole(session.getUserRole())
            return
        }

        setContentView(R.layout.activity_login)

        etUsername = findViewById(R.id.etUsername)
        etPassword = findViewById(R.id.etPassword)
        rbProsumer = findViewById(R.id.rbProsumer)
        val btnLogin: Button = findViewById(R.id.btnLogin)
        val btnRegister: Button = findViewById(R.id.btnRegister)
        btnServerConfig = findViewById(R.id.btnServerConfig)

        updateServerButtonText()

        btnLogin.setOnClickListener { handleLogin() }
        btnRegister.setOnClickListener { startActivity(Intent(this, RegisterActivity::class.java)) }
        btnServerConfig.setOnClickListener { showServerConfigDialog() }
    }

    private fun updateServerButtonText() {
        val currentHost = Constants.getServerHost(this)
        btnServerConfig.text = "🌐 Server: $currentHost:${Constants.DEFAULT_SERVER_PORT}"
    }

    // Dialog to change server IP (e.g. PC's Wi-Fi IP 192.168.244.93, 10.0.2.2 for emulator, or 127.0.0.1 for adb reverse)
    private fun showServerConfigDialog() {
        val input = EditText(this).apply {
            setText(Constants.getServerHost(this@LoginActivity))
            hint = "e.g. 192.168.244.93 or 10.0.2.2 or 127.0.0.1"
            setPadding(40, 30, 40, 30)
        }

        AlertDialog.Builder(this)
            .setTitle("Configure Server Host IP")
            .setMessage("For physical devices on Wi-Fi, enter your PC's Wi-Fi IPv4 address.\nFor Android Emulator, use 10.0.2.2.\nFor USB/Wi-Fi adb reverse, use 127.0.0.1.")
            .setView(input)
            .setPositiveButton("Save") { _, _ ->
                val newHost = input.text.toString().trim()
                if (newHost.isNotEmpty()) {
                    Constants.setServerHost(this, newHost)
                    updateServerButtonText()
                    Toast.makeText(this, "Server updated to: ${Constants.BASE_URL}", Toast.LENGTH_LONG).show()
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    // Validate inputs and send login request to the central API
    private fun handleLogin() {
        val username = etUsername.text.toString().trim()
        val password = etPassword.text.toString().trim()
        val loginType = if (rbProsumer.isChecked) "Prosumer" else "User"

        if (username.isEmpty() || password.isEmpty()) {
            Toast.makeText(this, "Please enter username and password", Toast.LENGTH_SHORT).show()
            return
        }

        Log.i(TAG, "Attempting login for '$username' as $loginType via ${Constants.BASE_URL}")

        try {
            val payload = JSONObject().apply {
                put("username", username)
                put("password", password)
                put("loginType", loginType)
            }

            ApiClient.request("auth/login", "POST", payload, null, object : ApiClient.ApiCallback {
                override fun onSuccess(response: String) {
                    try {
                        val res = JSONObject(response)
                        val token = res.getString("token")
                        val role = res.getString("role")
                        val userId = res.getString("userId")
                        val displayName = res.getString("displayName")

                        Log.i(TAG, "Login successful for $username ($role)")
                        session.createLoginSession(token, userId, username, role, displayName)
                        navigateByRole(role)
                    } catch (e: Exception) {
                        Log.e(TAG, "Parsing error on login response", e)
                        Toast.makeText(this@LoginActivity, "Response parsing error", Toast.LENGTH_SHORT).show()
                    }
                }

                override fun onError(error: String) {
                    Log.e(TAG, "Login failed: $error")
                    AlertDialog.Builder(this@LoginActivity)
                        .setTitle("Sign In Failed")
                        .setMessage(error)
                        .setPositiveButton("OK", null)
                        .setNeutralButton("Change Server IP") { _, _ -> showServerConfigDialog() }
                        .show()
                }
            })
        } catch (e: Exception) {
            Log.e(TAG, "Request build error", e)
            Toast.makeText(this, "Request error: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    // Navigate to the appropriate dashboard based on user role
    private fun navigateByRole(role: String) {
        val intent = when {
            role.equals("Backoffice", ignoreCase = true) ->
                Intent(this, BackofficeMainActivity::class.java)
            role.equals("GridOperator", ignoreCase = true) || role.equals("Operator", ignoreCase = true) ->
                Intent(this, OperatorMainActivity::class.java)
            else ->
                Intent(this, ProsumerMainActivity::class.java)
        }
        startActivity(intent)
        finish()
    }
}
