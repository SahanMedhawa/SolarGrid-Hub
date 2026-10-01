package com.smartsolar.microgrid.ui.auth

import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.widget.Button
import android.widget.EditText
import android.widget.RadioButton
import android.widget.TextView
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
 * Backed by automatic zero-configuration server discovery.
 */
class LoginActivity : AppCompatActivity() {

    private val TAG = "LoginActivity"
    private lateinit var etUsername: EditText
    private lateinit var etPassword: EditText
    private lateinit var rbProsumer: RadioButton
    private lateinit var btnLogin: Button
    private lateinit var btnForgotPassword: TextView
    private lateinit var session: SessionManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        session = SessionManager(this)

        // Warm up zero-configuration server discovery in the background
        Thread { Constants.ensureBaseUrl(this) }.start()

        // Check if session already exists
        if (session.isLoggedIn()) {
            navigateByRole(session.getUserRole())
            return
        }

        setContentView(R.layout.activity_login)

        etUsername = findViewById(R.id.etUsername)
        etPassword = findViewById(R.id.etPassword)
        rbProsumer = findViewById(R.id.rbProsumer)
        btnLogin = findViewById(R.id.btnLogin)
        btnForgotPassword = findViewById(R.id.btnForgotPassword)
        val btnRegister: Button = findViewById(R.id.btnRegister)

        btnLogin.setOnClickListener { handleLogin() }
        btnRegister.setOnClickListener { startActivity(Intent(this, RegisterActivity::class.java)) }
        btnForgotPassword.setOnClickListener {
            startActivity(Intent(this, ForgotPasswordActivity::class.java))
        }
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

        Log.i(TAG, "Attempting login for '$username' as $loginType")
        btnLogin.isEnabled = false
        btnLogin.text = "Signing In..."

        try {
            val payload = JSONObject().apply {
                put("username", username)
                put("password", password)
                put("loginType", loginType)
            }

            ApiClient.request("auth/login", "POST", payload, null, object : ApiClient.ApiCallback {
                override fun onSuccess(response: String) {
                    btnLogin.isEnabled = true
                    btnLogin.text = getString(R.string.sign_in)
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
                    btnLogin.isEnabled = true
                    btnLogin.text = getString(R.string.sign_in)
                    Log.e(TAG, "Login failed: $error")
                    AlertDialog.Builder(this@LoginActivity)
                        .setTitle("Sign In Failed")
                        .setMessage(error)
                        .setPositiveButton("OK", null)
                        .show()
                }
            })
        } catch (e: Exception) {
            btnLogin.isEnabled = true
            btnLogin.text = getString(R.string.sign_in)
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