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
import org.json.JSONObject

/**
 * Step 1 of Forgot Password flow: verify the account exists
 * before allowing a password reset. No email is sent — this
 * satisfies the assignment's account-recovery requirement in a
 * simplified two-screen flow.
 */
class ForgotPasswordActivity : AppCompatActivity() {

    private lateinit var etUsernameOrNic: EditText
    private lateinit var rbUser: RadioButton
    private lateinit var rbProsumer: RadioButton
    private lateinit var btnVerify: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_forgot_password)

        etUsernameOrNic = findViewById(R.id.etUsernameOrNic)
        rbUser = findViewById(R.id.rbUserType)
        rbProsumer = findViewById(R.id.rbProsumerType)
        btnVerify = findViewById(R.id.btnVerify)

        btnVerify.setOnClickListener { handleVerify() }
    }

    private fun handleVerify() {
        val input = etUsernameOrNic.text.toString().trim()
        if (input.isEmpty()) {
            Toast.makeText(this, "Please enter your username or NIC", Toast.LENGTH_SHORT).show()
            return
        }

        val loginType = if (rbProsumer.isChecked) "Prosumer" else "User"

        val payload = JSONObject().apply {
            put("usernameOrNic", input)
            put("loginType", loginType)
        }

        btnVerify.isEnabled = false
        btnVerify.text = "Verifying..."

        ApiClient.request("auth/forgot-password/verify", "POST", payload, null, object : ApiClient.ApiCallback {
            override fun onSuccess(response: String) {
                btnVerify.isEnabled = true
                btnVerify.text = "Continue"
                Toast.makeText(this@ForgotPasswordActivity, "Account verified!", Toast.LENGTH_SHORT).show()

                val intent = Intent(this@ForgotPasswordActivity, ResetPasswordActivity::class.java)
                intent.putExtra("usernameOrNic", input)
                intent.putExtra("loginType", loginType)
                startActivity(intent)
            }

            override fun onError(error: String) {
                btnVerify.isEnabled = true
                btnVerify.text = "Continue"
                Toast.makeText(this@ForgotPasswordActivity, error, Toast.LENGTH_LONG).show()
            }
        })
    }
}