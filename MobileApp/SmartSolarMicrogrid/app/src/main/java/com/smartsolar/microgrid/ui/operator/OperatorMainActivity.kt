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
import com.google.android.material.bottomnavigation.BottomNavigationView
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
    private val slotMap = HashMap<String, String>()

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

        // Bottom navigation: Home / Profile / Logout
        val bottomNav = findViewById<BottomNavigationView>(R.id.bottomNavOperator)
        bottomNav.selectedItemId = R.id.navHome
        bottomNav.setOnItemSelectedListener { item ->
            when (item.itemId) {
                R.id.navHome -> true
                R.id.navProfile -> {
                    startActivity(Intent(this, ProfileActivity::class.java))
                    overridePendingTransition(0, 0)
                    true
                }
                R.id.navLogout -> {
                    session.logout()
                    startActivity(Intent(this, LoginActivity::class.java))
                    finish()
                    true
                }
                else -> false
            }
        }
    }

    override fun onResume() {
        super.onResume()
        loadBookings()
    }

    // Handle manual QR token verification
    private fun handleManualVerification() {
        val tokenInput = etManualQrToken.text.toString().trim()
        val cbInterlock = findViewById<com.google.android.material.checkbox.MaterialCheckBox?>(R.id.cbSafetyInterlock)
        if (cbInterlock != null && !cbInterlock.isChecked) {
            Toast.makeText(this, "Safety Alert: Please confirm Inverter Physical Interlock is latched and grounded before finalizing transfer.", Toast.LENGTH_LONG).show()
            return
        }

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
                    val startTime = detailObj.optString("startTime", "")
                    val endTime = detailObj.optString("endTime", "")
                    val slotsArr = detailObj.optJSONArray("allocatedSlotIds")
                    val slotNamesArr = detailObj.optJSONArray("allocatedSlotNames")
                    val slotDisplay = if (slotNamesArr != null && slotNamesArr.length() > 0) {
                        val sList = mutableListOf<String>()
                        for (j in 0 until slotNamesArr.length()) sList.add(slotNamesArr.getString(j))
                        sList.joinToString(", ")
                    } else if (slotsArr != null && slotsArr.length() > 0) {
                        val sList = mutableListOf<String>()
                        for (j in 0 until slotsArr.length()) {
                            val sId = slotsArr.getString(j)
                            sList.add(slotMap[sId] ?: "Slot #${j + 1}")
                        }
                        sList.joinToString(", ")
                    } else if (slot.isNotEmpty()) {
                        slotMap[slot] ?: "Slot #1"
                    } else {
                        "Dynamic"
                    }
                    val timeWindow = if (startTime.isNotEmpty() && endTime.isNotEmpty()) "$startTime - $endTime" else "Standard Window"

                    if (!status.equals("Approved", ignoreCase = true)) {
                        AlertDialog.Builder(this@OperatorMainActivity)
                            .setTitle("Cannot Finalize Transfer")
                            .setMessage("Reservation is currently '$status'. Only 'Approved' bookings can be finalized.")
                            .setPositiveButton("OK", null)
                            .show()
                        return
                    }

                    // Prompt Operator to finalize transfer
                    AlertDialog.Builder(this@OperatorMainActivity)
                        .setTitle("Verify Server Data ⚡")
                        .setMessage(
                            "Verified Reservation Record:\n" +
                                    "• Prosumer NIC: $nic\n" +
                                    "• Time Window: $timeWindow\n" +
                                    "• Battery Slots: $slotDisplay\n" +
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

                    // Preload station slots for readable slot names
                    val nodeIds = mutableSetOf<String>()
                    for (i in 0 until list.length()) {
                        val nId = list.optJSONObject(i)?.optString("nodeId", "") ?: ""
                        if (nId.isNotEmpty()) nodeIds.add(nId)
                    }
                    for (nId in nodeIds) {
                        loadStationSlots(nId)
                    }

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

    private fun loadStationSlots(nodeId: String) {
        ApiClient.request("energyslot/node/$nodeId", "GET", null, session.getToken(), object : ApiClient.ApiCallback {
            override fun onSuccess(resp: String) {
                try {
                    val arr = JSONArray(resp)
                    for (i in 0 until arr.length()) {
                        val s = arr.getJSONObject(i)
                        val sId = s.optString("id", "")
                        val sNum = s.optInt("slotNumber", i + 1)
                        if (sId.isNotEmpty()) {
                            slotMap[sId] = "Slot #$sNum"
                        }
                    }
                } catch (_: Exception) {}
            }
            override fun onError(error: String) {}
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
                val slot = r.optString("slotId", "")
                val startTime = r.optString("startTime", "")
                val endTime = r.optString("endTime", "")
                val slotsArr = r.optJSONArray("allocatedSlotIds")
                val slotNamesArr = r.optJSONArray("allocatedSlotNames")
                val slotDisplay = if (slotNamesArr != null && slotNamesArr.length() > 0) {
                    val sList = mutableListOf<String>()
                    for (j in 0 until slotNamesArr.length()) sList.add(slotNamesArr.getString(j))
                    sList.joinToString(", ")
                } else if (slotsArr != null && slotsArr.length() > 0) {
                    val sList = mutableListOf<String>()
                    for (j in 0 until slotsArr.length()) {
                        val sId = slotsArr.getString(j)
                        val name = slotMap[sId] ?: "Slot #${j + 1}"
                        sList.add(name)
                    }
                    sList.joinToString(", ")
                } else if (slot.isNotEmpty()) {
                    slotMap[slot] ?: "Slot #1"
                } else {
                    "Auto-allocated"
                }
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
                    text = "Prosumer: $nic"
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
                val timeWindow = if (startTime.isNotEmpty() && endTime.isNotEmpty()) " [$startTime - $endTime]" else ""
                val tvDetails = TextView(this).apply {
                    text = "⚡ Energy: $energy kWh • Slots: $slotDisplay\n📅 Date: $formattedDate$timeWindow"
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