package com.smartsolar.microgrid.ui.auth

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.RadioButton
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.smartsolar.microgrid.R
import com.smartsolar.microgrid.api.ApiClient
import com.smartsolar.microgrid.data.SessionManager
import com.smartsolar.microgrid.ui.backoffice.BackofficeMainActivity
import com.smartsolar.microgrid.ui.operator.OperatorMainActivity
import com.smartsolar.microgrid.ui.prosumer.ProsumerMainActivity
import org.json.JSONObject

/**
 * Login Activity - handles user authentication via the central Web API.
 * Routes users to role-specific dashboards (Prosumer, Operator, Backoffice).
 */
class LoginActivity : AppCompatActivity() {

    private lateinit var etUsername: EditText
    private lateinit var etPassword: EditText
    private lateinit var rbProsumer: RadioButton
    private lateinit var session: SessionManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        session = SessionManager(this)

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

        btnLogin.setOnClickListener { handleLogin() }
        btnRegister.setOnClickListener { startActivity(Intent(this, RegisterActivity::class.java)) }
    }

    // Validate inputs and send login request to the central API
    private fun handleLogin() {
        val username = etUsername.text.toString().trim()
        val password = etPassword.text.toString().trim()
        val loginType = if (rbProsumer.isChecked) "Prosumer" else "User"

        if (username.isEmpty() || password.isEmpty()) {
            Toast.makeText(this, "Please fill in all fields", Toast.LENGTH_SHORT).show()
            return
        }

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

                        session.createLoginSession(token, userId, username, role, displayName)
                        navigateByRole(role)
                    } catch (e: Exception) {
                        Toast.makeText(this@LoginActivity, "Response parsing error", Toast.LENGTH_SHORT).show()
                    }
                }

                override fun onError(error: String) {
                    Toast.makeText(this@LoginActivity, error, Toast.LENGTH_LONG).show()
                }
            })
        } catch (e: Exception) {
            Toast.makeText(this, "Request error", Toast.LENGTH_SHORT).show()
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
