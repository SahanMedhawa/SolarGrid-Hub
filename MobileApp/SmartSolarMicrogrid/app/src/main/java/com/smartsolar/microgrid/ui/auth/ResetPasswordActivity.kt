package com.smartsolar.microgrid.ui.auth

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.smartsolar.microgrid.R
import com.smartsolar.microgrid.api.ApiClient
import org.json.JSONObject

/**
 * Step 2 of Forgot Password flow: set a new password directly
 * for the account verified in ForgotPasswordActivity.
 */
class ResetPasswordActivity : AppCompatActivity() {

    private lateinit var tvResetFor: TextView
    private lateinit var etNewPassword: EditText
    private lateinit var etConfirmPassword: EditText
    private lateinit var btnResetPassword: Button

    private var usernameOrNic: String = ""
    private var loginType: String = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_reset_password)

        usernameOrNic = intent.getStringExtra("usernameOrNic") ?: ""
        loginType = intent.getStringExtra("loginType") ?: "User"

        tvResetFor = findViewById(R.id.tvResetFor)
        etNewPassword = findViewById(R.id.etNewPassword)
        etConfirmPassword = findViewById(R.id.etConfirmPassword)
        btnResetPassword = findViewById(R.id.btnResetPassword)

        tvResetFor.text = "Resetting password for: $usernameOrNic"

        btnResetPassword.setOnClickListener { handleReset() }
    }

    private fun handleReset() {
        val newPass = etNewPassword.text.toString().trim()
        val confirm = etConfirmPassword.text.toString().trim()

        if (newPass.length < 6) {
            Toast.makeText(this, "Password must be at least 6 characters", Toast.LENGTH_SHORT).show()
            return
        }
        if (newPass != confirm) {
            Toast.makeText(this, "Passwords do not match", Toast.LENGTH_SHORT).show()
            return
        }

        val payload = JSONObject().apply {
            put("usernameOrNic", usernameOrNic)
            put("loginType", loginType)
            put("newPassword", newPass)
        }

        btnResetPassword.isEnabled = false
        btnResetPassword.text = "Resetting..."

        ApiClient.request("auth/forgot-password/reset", "POST", payload, null, object : ApiClient.ApiCallback {
            override fun onSuccess(response: String) {
                Toast.makeText(this@ResetPasswordActivity, "Password reset successfully! Please log in.", Toast.LENGTH_LONG).show()
                val intent = Intent(this@ResetPasswordActivity, LoginActivity::class.java)
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                startActivity(intent)
                finish()
            }

            override fun onError(error: String) {
                btnResetPassword.isEnabled = true
                btnResetPassword.text = "Reset Password"
                Toast.makeText(this@ResetPasswordActivity, error, Toast.LENGTH_LONG).show()
            }
        })
    }
}