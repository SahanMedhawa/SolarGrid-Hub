package com.smartsolar.microgrid.ui.operator

import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.google.android.material.card.MaterialCardView
import com.smartsolar.microgrid.R
import com.smartsolar.microgrid.api.ApiClient
import com.smartsolar.microgrid.data.SessionManager
import com.smartsolar.microgrid.ui.auth.LoginActivity
import org.json.JSONArray
import org.json.JSONObject

/**
 * Grid Operator Main Dashboard Activity.
 * Provides QR scanning/manual verification for energy transfers,
 * booking queue management, and approval/completion workflows.
 */
class OperatorMainActivity : AppCompatActivity() {

    private lateinit var session: SessionManager
    private lateinit var tvOperatorWelcome: TextView
    private lateinit var tvCountPending: TextView
    private lateinit var tvCountApproved: TextView
    private lateinit var tvCountCompleted: TextView
    private lateinit var etManualQrToken: EditText
    private lateinit var llOperatorBookingsList: LinearLayout

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        session = SessionManager(this)
        setContentView(R.layout.activity_operator_main)

        tvOperatorWelcome = findViewById(R.id.tvOperatorWelcome)
        tvCountPending = findViewById(R.id.tvCountPending)
        tvCountApproved = findViewById(R.id.tvCountApproved)
        tvCountCompleted = findViewById(R.id.tvCountCompleted)
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

    // Handle manual QR token verification
    private fun handleManualVerification() {
        val tokenInput = etManualQrToken.text.toString().trim()
        if (tokenInput.isEmpty()) {
            Toast.makeText(this, "Please enter or paste QR token", Toast.LENGTH_SHORT).show()
            return
        }

        // Format: SMTS-{reservationId}-{prosumerNic}-{guid}
        val parts = tokenInput.split("-")
        if (parts.size < 2) {
            Toast.makeText(this, "Invalid QR token format (expected SMTS-{id}-...)", Toast.LENGTH_SHORT).show()
            return
        }

        val resId = parts[1]

        // First verify server data to present prosumer and transfer specs
        ApiClient.request("reservation/$resId", "GET", null, session.getToken(), object : ApiClient.ApiCallback {
            override fun onSuccess(resDetailResp: String) {
                try {
                    val detailObj = JSONObject(resDetailResp)
                    val nic = detailObj.optString("prosumerNic", "")
                    val energy = detailObj.optDouble("energyKWh", 0.0)
                    val status = detailObj.optString("status", "")
                    val slot = detailObj.optString("slotId", "")

                    if (!status.equals("Approved", ignoreCase = true)) {
                        AlertDialog.Builder(this@OperatorMainActivity)
                            .setTitle("Cannot Finalize Transfer")
                            .setMessage("Reservation #$resId is currently '$status'. Only 'Approved' bookings can be finalized.")
                            .setPositiveButton("OK", null)
                            .show()
                        return
                    }

                    // Prompt Operator to finalize transfer
                    AlertDialog.Builder(this@OperatorMainActivity)
                        .setTitle("Verify Server Data ⚡")
                        .setMessage(
                            "Verified Reservation Record:\n" +
                            "• Booking ID: #$resId\n" +
                            "• Prosumer NIC: $nic\n" +
                            "• Battery Slot: $slot\n" +
                            "• Transfer Energy: $energy kWh\n\n" +
                            "Do you want to finalize this energy transfer and release battery storage capacity?"
                        )
                        .setPositiveButton("Finalize Transfer") { _, _ ->
                            completeEnergyTransfer(resId, tokenInput)
                        }
                        .setNegativeButton("Cancel", null)
                        .show()

                } catch (e: Exception) {
                    completeEnergyTransfer(resId, tokenInput)
                }
            }

            override fun onError(err: String) {
                // Try completing directly if detail lookup fails
                completeEnergyTransfer(resId, tokenInput)
            }
        })
    }

    // Call server to complete energy transfer
    private fun completeEnergyTransfer(resId: String, token: String) {
        try {
            val body = JSONObject().apply {
                put("qrData", token)
            }

            ApiClient.request("reservation/$resId/complete", "PUT", body, session.getToken(), object : ApiClient.ApiCallback {
                override fun onSuccess(response: String) {
                    AlertDialog.Builder(this@OperatorMainActivity)
                        .setTitle("Energy Transfer Completed! ⚡")
                        .setMessage("Successfully verified QR token and finalized energy transfer for reservation #$resId.\nBattery storage slot has been recycled back to available capacity.")
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

    // Load all bookings from the central API
    private fun loadBookings() {
        llOperatorBookingsList.removeAllViews()

        ApiClient.request("reservation", "GET", null, session.getToken(), object : ApiClient.ApiCallback {
            override fun onSuccess(response: String) {
                try {
                    val list = JSONArray(response)
                    updateStats(list)
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

    // Update KPI counters
    private fun updateStats(list: JSONArray) {
        var pending = 0
        var approved = 0
        var completed = 0

        for (i in 0 until list.length()) {
            val obj = list.optJSONObject(i) ?: continue
            when (obj.optString("status", "").lowercase()) {
                "pending" -> pending++
                "approved" -> approved++
                "completed" -> completed++
            }
        }

        tvCountPending.text = pending.toString()
        tvCountApproved.text = approved.toString()
        tvCountCompleted.text = completed.toString()
    }

    // Render bookings queue with Material 3 cards and dark mode safe contrast
    private fun renderBookings(list: JSONArray) {
        llOperatorBookingsList.removeAllViews()

        if (list.length() == 0) {
            val empty = TextView(this).apply {
                text = "No reservations in station queue."
                setTextColor(ContextCompat.getColor(this@OperatorMainActivity, R.color.text_secondary))
                setPadding(20, 20, 20, 20)
                textSize = 14f
            }
            llOperatorBookingsList.addView(empty)
            return
        }

        val textPrimaryColor = ContextCompat.getColor(this, R.color.text_primary)
        val textSecondaryColor = ContextCompat.getColor(this, R.color.text_secondary)

        for (i in 0 until list.length()) {
            try {
                val r = list.getJSONObject(i)
                val id = r.optString("id")
                val nic = r.optString("prosumerNic")
                val status = r.optString("status")
                val slot = r.optString("slotId", "SLOT-01")
                val energy = r.optDouble("energyKWh", 0.0)
                val date = r.optString("reservationDate", "")
                val qrToken = r.optString("qrCodeData", "")

                val card = MaterialCardView(this).apply {
                    radius = 16f * resources.displayMetrics.density
                    strokeWidth = (1f * resources.displayMetrics.density).toInt()
                    strokeColor = ContextCompat.getColor(this@OperatorMainActivity, R.color.card_border)
                    setCardBackgroundColor(ContextCompat.getColor(this@OperatorMainActivity, R.color.card_background))
                    cardElevation = 1f * resources.displayMetrics.density
                    layoutParams = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                    ).apply { setMargins(0, 0, 0, (10 * resources.displayMetrics.density).toInt()) }
                }

                val cardContent = LinearLayout(this).apply {
                    orientation = LinearLayout.VERTICAL
                    val p = (16 * resources.displayMetrics.density).toInt()
                    setPadding(p, p, p, p)
                }

                // Header Row
                val headerRow = LinearLayout(this).apply {
                    orientation = LinearLayout.HORIZONTAL
                    layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
                }

                val tvHead = TextView(this).apply {
                    text = "Booking #${if (id.length > 8) id.substring(0, 8) else id}"
                    textSize = 15f
                    setTextColor(textPrimaryColor)
                    setTypeface(typeface, android.graphics.Typeface.BOLD)
                    layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
                }
                headerRow.addView(tvHead)

                val tvStatusBadge = TextView(this).apply {
                    text = status
                    textSize = 12f
                    setTypeface(typeface, android.graphics.Typeface.BOLD)
                    val pL = (10 * resources.displayMetrics.density).toInt()
                    val pT = (3 * resources.displayMetrics.density).toInt()
                    setPadding(pL, pT, pL, pT)
                    setBackgroundResource(R.drawable.badge_status_bg)
                    setTextColor(
                        when (status.lowercase()) {
                            "approved" -> ContextCompat.getColor(this@OperatorMainActivity, R.color.status_approved)
                            "completed" -> ContextCompat.getColor(this@OperatorMainActivity, R.color.status_completed)
                            "pending" -> ContextCompat.getColor(this@OperatorMainActivity, R.color.status_pending)
                            else -> textSecondaryColor
                        }
                    )
                }
                headerRow.addView(tvStatusBadge)
                cardContent.addView(headerRow)

                // Details Text
                val formattedDate = if (date.length >= 10) date.substring(0, 10) else date
                val tvDetails = TextView(this).apply {
                    text = "Prosumer: $nic • Slot: $slot\nDate: $formattedDate • Energy: $energy kWh"
                    textSize = 13f
                    setTextColor(textSecondaryColor)
                    setLineSpacing(4f, 1f)
                    val m = (6 * resources.displayMetrics.density).toInt()
                    setPadding(0, m, 0, m)
                }
                cardContent.addView(tvDetails)

                // Actions according to status
                if ("Pending".equals(status, ignoreCase = true)) {
                    val btnApprove = Button(this).apply {
                        text = "✅ Approve & Generate QR"
                        setBackgroundColor(ContextCompat.getColor(this@OperatorMainActivity, R.color.primary))
                        setTextColor(Color.WHITE)
                        textSize = 13f
                        layoutParams = LinearLayout.LayoutParams(
                            LinearLayout.LayoutParams.MATCH_PARENT,
                            (48 * resources.displayMetrics.density).toInt()
                        ).apply { setMargins(0, (6 * resources.displayMetrics.density).toInt(), 0, 0) }
                    }

                    btnApprove.setOnClickListener {
                        ApiClient.request("reservation/$id/approve", "PUT", null, session.getToken(), object : ApiClient.ApiCallback {
                            override fun onSuccess(resp: String) {
                                Toast.makeText(this@OperatorMainActivity, "Booking approved! Secure QR token dispatched.", Toast.LENGTH_SHORT).show()
                                loadBookings()
                            }

                            override fun onError(err: String) {
                                Toast.makeText(this@OperatorMainActivity, "Approval failed: $err", Toast.LENGTH_LONG).show()
                            }
                        })
                    }
                    cardContent.addView(btnApprove)
                } else if ("Approved".equals(status, ignoreCase = true) && qrToken.isNotEmpty()) {
                    val btnFill = Button(this).apply {
                        text = "⚡ Verify & Finalize Transfer"
                        setBackgroundColor(ContextCompat.getColor(this@OperatorMainActivity, R.color.accent))
                        setTextColor(Color.WHITE)
                        textSize = 13f
                        layoutParams = LinearLayout.LayoutParams(
                            LinearLayout.LayoutParams.MATCH_PARENT,
                            (48 * resources.displayMetrics.density).toInt()
                        ).apply { setMargins(0, (6 * resources.displayMetrics.density).toInt(), 0, 0) }
                    }

                    btnFill.setOnClickListener {
                        etManualQrToken.setText(qrToken)
                        handleManualVerification()
                    }
                    cardContent.addView(btnFill)
                }

                card.addView(cardContent)
                llOperatorBookingsList.addView(card)
            } catch (_: Exception) { }
        }
    }
}
