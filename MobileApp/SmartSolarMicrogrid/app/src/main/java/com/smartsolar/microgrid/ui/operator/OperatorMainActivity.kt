package com.smartsolar.microgrid.ui.operator

import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import com.smartsolar.microgrid.R
import com.smartsolar.microgrid.api.ApiClient
import com.smartsolar.microgrid.data.SessionManager
import com.smartsolar.microgrid.ui.auth.LoginActivity
import org.json.JSONArray
import org.json.JSONObject

/**
 * Grid Operator Main Dashboard Activity.
 * Provides QR scanning/manual verification for energy transfers,
 * booking management, and approval/completion workflows.
 */
class OperatorMainActivity : AppCompatActivity() {

    private lateinit var session: SessionManager
    private lateinit var tvOperatorWelcome: TextView
    private lateinit var etManualQrToken: EditText
    private lateinit var llOperatorBookingsList: LinearLayout

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        session = SessionManager(this)
        setContentView(R.layout.activity_operator_main)

        tvOperatorWelcome = findViewById(R.id.tvOperatorWelcome)
        etManualQrToken = findViewById(R.id.etManualQrToken)
        llOperatorBookingsList = findViewById(R.id.llOperatorBookingsList)

        tvOperatorWelcome.text = "Welcome, ${session.getDisplayName()}"

        findViewById<Button>(R.id.btnScanQr).setOnClickListener {
            startActivity(Intent(this, QrScannerActivity::class.java))
        }

        findViewById<Button>(R.id.btnManualVerify).setOnClickListener { handleManualVerification() }

        findViewById<Button>(R.id.btnRefreshOperator).setOnClickListener { loadBookings() }

        findViewById<Button>(R.id.btnOperatorLogout).setOnClickListener {
            session.logout()
            startActivity(Intent(this, LoginActivity::class.java))
            finish()
        }
    }

    override fun onResume() {
        super.onResume()
        loadBookings()
    }

    // Handle manual QR token verification by parsing token and calling the complete API
    private fun handleManualVerification() {
        val tokenInput = etManualQrToken.text.toString().trim()
        if (tokenInput.isEmpty()) {
            Toast.makeText(this, "Please enter or paste QR token", Toast.LENGTH_SHORT).show()
            return
        }

        // Format is typically SMTS-{resId}-{nic}-{guid}
        val parts = tokenInput.split("-")
        if (parts.size < 2) {
            Toast.makeText(this, "Invalid QR token format (expected SMTS-{id}-...)", Toast.LENGTH_SHORT).show()
            return
        }

        val resId = parts[1]

        try {
            val body = JSONObject().apply {
                put("qrData", tokenInput)
            }

            ApiClient.request("reservation/$resId/complete", "PUT", body, session.getToken(), object : ApiClient.ApiCallback {
                override fun onSuccess(response: String) {
                    AlertDialog.Builder(this@OperatorMainActivity)
                        .setTitle("Energy Transfer Completed! ⚡")
                        .setMessage("Successfully verified QR token and finalized energy transfer for reservation #$resId")
                        .setPositiveButton("OK") { _, _ ->
                            etManualQrToken.setText("")
                            loadBookings()
                        }
                        .show()
                }

                override fun onError(error: String) {
                    AlertDialog.Builder(this@OperatorMainActivity)
                        .setTitle("Verification Failed")
                        .setMessage(error)
                        .setPositiveButton("Dismiss", null)
                        .show()
                }
            })
        } catch (e: Exception) {
            Toast.makeText(this, "Verification error: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    // Load all bookings from the central API and render them
    private fun loadBookings() {
        llOperatorBookingsList.removeAllViews()

        ApiClient.request("reservation", "GET", null, session.getToken(), object : ApiClient.ApiCallback {
            override fun onSuccess(response: String) {
                try {
                    val list = JSONArray(response)
                    renderBookings(list)
                } catch (e: Exception) {
                    Toast.makeText(this@OperatorMainActivity, "Error parsing bookings", Toast.LENGTH_SHORT).show()
                }
            }

            override fun onError(error: String) {
                Toast.makeText(this@OperatorMainActivity, "Bookings: $error", Toast.LENGTH_SHORT).show()
            }
        })
    }

    // Render the bookings list with status-based colour coding and action buttons
    private fun renderBookings(list: JSONArray) {
        llOperatorBookingsList.removeAllViews()

        if (list.length() == 0) {
            val empty = TextView(this).apply {
                text = "No active bookings found."
                setTextColor(Color.GRAY)
                setPadding(10, 10, 10, 10)
            }
            llOperatorBookingsList.addView(empty)
            return
        }

        for (i in 0 until list.length()) {
            try {
                val r = list.getJSONObject(i)
                val id = r.optString("id")
                val nic = r.optString("prosumerNic")
                val status = r.optString("status")
                val energy = r.optDouble("energyKWh", 0.0)
                val date = r.optString("reservationDate", "")
                val qrToken = r.optString("qrCodeData", "")

                val item = LinearLayout(this).apply {
                    orientation = LinearLayout.VERTICAL
                    setPadding(14, 14, 14, 14)
                    setBackgroundResource(R.drawable.card_bg)
                    layoutParams = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                    ).apply { setMargins(0, 0, 0, 10) }
                }

                val tvHead = TextView(this).apply {
                    text = "Booking #$id | $status"
                    textSize = 14f
                    setTextColor(
                        when {
                            "Approved".equals(status, ignoreCase = true) -> Color.parseColor("#0d6efd")
                            "Completed".equals(status, ignoreCase = true) -> Color.parseColor("#198754")
                            "Pending".equals(status, ignoreCase = true) -> Color.parseColor("#d97706")
                            else -> Color.GRAY
                        }
                    )
                }
                item.addView(tvHead)

                val tvDetails = TextView(this).apply {
                    text = "Prosumer: $nic | Energy: $energy kWh\nDate: ${if (date.length >= 10) date.substring(0, 10) else date}"
                    textSize = 12f
                    setTextColor(Color.DKGRAY)
                }
                item.addView(tvDetails)

                if ("Pending".equals(status, ignoreCase = true)) {
                    val btnApprove = Button(this).apply {
                        text = "✅ Approve & Generate QR"
                        setBackgroundColor(Color.parseColor("#198754"))
                        setTextColor(Color.WHITE)
                        textSize = 12f
                        layoutParams = LinearLayout.LayoutParams(
                            LinearLayout.LayoutParams.MATCH_PARENT, 100
                        ).apply { setMargins(0, 8, 0, 0) }
                    }

                    btnApprove.setOnClickListener {
                        ApiClient.request("reservation/$id/approve", "PUT", null, session.getToken(), object : ApiClient.ApiCallback {
                            override fun onSuccess(resp: String) {
                                Toast.makeText(this@OperatorMainActivity, "Booking approved! QR code generated.", Toast.LENGTH_SHORT).show()
                                loadBookings()
                            }

                            override fun onError(err: String) {
                                Toast.makeText(this@OperatorMainActivity, "Approval failed: $err", Toast.LENGTH_LONG).show()
                            }
                        })
                    }
                    item.addView(btnApprove)
                } else if ("Approved".equals(status, ignoreCase = true) && qrToken.isNotEmpty()) {
                    val btnFill = Button(this).apply {
                        text = "⚡ Use Token to Complete Transfer"
                        setBackgroundColor(Color.parseColor("#0d6efd"))
                        setTextColor(Color.WHITE)
                        textSize = 12f
                        layoutParams = LinearLayout.LayoutParams(
                            LinearLayout.LayoutParams.MATCH_PARENT, 100
                        ).apply { setMargins(0, 8, 0, 0) }
                    }

                    btnFill.setOnClickListener {
                        etManualQrToken.setText(qrToken)
                        handleManualVerification()
                    }
                    item.addView(btnFill)
                }

                llOperatorBookingsList.addView(item)
            } catch (_: Exception) { }
        }
    }
}
