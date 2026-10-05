package com.smartsolar.microgrid.ui.prosumer

import android.app.DatePickerDialog
import android.app.TimePickerDialog
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.graphics.Bitmap
import android.graphics.Color
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.google.zxing.BarcodeFormat
import com.journeyapps.barcodescanner.BarcodeEncoder
import com.google.android.material.card.MaterialCardView
import com.smartsolar.microgrid.R
import com.smartsolar.microgrid.api.ApiClient
import com.smartsolar.microgrid.data.SessionManager
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

/**
 * Reservation Detail Activity - shows full booking details including
 * secure QR transaction pass dispatch, modification/rescheduling, and cancellation.
 */
class ReservationDetailActivity : AppCompatActivity() {

    private data class BatterySlotUI(
        val id: String,
        val slotNumber: Int,
        val capacityKWh: Double,
        val status: String,
        val isBooked: Boolean,
        val isAvailable: Boolean
    )

    private var resId: String? = null
    private lateinit var session: SessionManager

    private lateinit var tvDetailStatusBadge: TextView
    private lateinit var ivQrCode: ImageView
    private lateinit var tvQrTitle: TextView
    private lateinit var tvQrToken: TextView
    private lateinit var btnCopyToken: Button
    private lateinit var tvQrNotice: TextView
    private lateinit var tvDetailInfo: TextView
    private lateinit var cardQrPass: View
    private lateinit var cardQrContainer: View
    private lateinit var btnModify: Button
    private lateinit var btnCancel: Button

    private var currentStatus: String = ""
    private var currentDateStr: String = ""
    private var currentStartTime: String = ""
    private var currentEndTime: String = ""
    private var currentEnergyKWh: Double = 0.0
    private var currentQrData: String = ""
    private var currentSlotId: String = ""
    private var currentNodeId: String = ""
    private val currentAllocatedSlots = ArrayList<String>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        session = SessionManager(this)
        setContentView(R.layout.activity_reservation_detail)

        resId = intent.getStringExtra("resId")

        tvDetailStatusBadge = findViewById(R.id.tvDetailStatusBadge)
        cardQrPass = findViewById(R.id.cardQrPass)
        cardQrContainer = findViewById(R.id.cardQrContainer)
        ivQrCode = findViewById(R.id.ivQrCode)
        tvQrTitle = findViewById(R.id.tvQrTitle)
        tvQrToken = findViewById(R.id.tvQrToken)
        btnCopyToken = findViewById(R.id.btnCopyToken)
        tvQrNotice = findViewById(R.id.tvQrNotice)
        tvDetailInfo = findViewById(R.id.tvDetailInfo)
        btnModify = findViewById(R.id.btnModifyReservation)
        btnCancel = findViewById(R.id.btnCancelReservation)

        btnCopyToken.setOnClickListener {
            if (currentQrData.isNotEmpty()) {
                val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                val clip = ClipData.newPlainText("QR Token", currentQrData)
                clipboard.setPrimaryClip(clip)
                Toast.makeText(this, "QR Token copied to clipboard!", Toast.LENGTH_SHORT).show()
            }
        }

        btnModify.setOnClickListener { showModifyDialog() }
        btnCancel.setOnClickListener { cancelBooking() }

        loadDetail()
    }

    // Load reservation details from API, or SQLite cache if offline
    private fun loadDetail() {
        if (resId.isNullOrEmpty()) {
            finish()
            return
        }

        ApiClient.request("reservation/$resId", "GET", null, session.getToken(), object : ApiClient.ApiCallback {
            override fun onSuccess(response: String) {
                try {
                    val obj = JSONObject(response)
                    displayReservationDetails(obj)
                } catch (_: Exception) {
                    loadFromLocalDatabase()
                }
            }

            override fun onError(error: String) {
                loadFromLocalDatabase()
            }
        })
    }

    // Load from local SQLite cache
    private fun loadFromLocalDatabase() {
        val cached = session.dbHelper.getCachedReservations(session.getUserNic()).find { it.id == resId }
        if (cached != null) {
            val json = JSONObject().apply {
                put("id", cached.id)
                put("status", cached.status)
                put("reservationDate", cached.reservationDate)
                put("startTime", cached.startTime)
                put("endTime", cached.endTime)
                put("energyKWh", cached.energyKWh)
                put("qrCodeData", cached.qrCodeData)
                put("slotId", cached.slotId)
                put("nodeId", cached.nodeId)
                put("prosumerNic", cached.prosumerNic)
                val slotsArr = JSONArray()
                for (s in cached.allocatedSlotIds) {
                    slotsArr.put(s)
                }
                put("allocatedSlotIds", slotsArr)
            }
            displayReservationDetails(json)
        } else {
            Toast.makeText(this, "Reservation details unavailable offline", Toast.LENGTH_SHORT).show()
        }
    }

    // Render reservation details and QR pass
    private fun displayReservationDetails(obj: JSONObject) {
        currentStatus = obj.optString("status", "Pending")
        currentDateStr = obj.optString("reservationDate", "")
        currentStartTime = obj.optString("startTime", "")
        currentEndTime = obj.optString("endTime", "")
        currentEnergyKWh = obj.optDouble("energyKWh", 0.0)
        currentQrData = obj.optString("qrCodeData", "")
        currentSlotId = obj.optString("slotId", "")
        currentNodeId = obj.optString("nodeId", "")
        val prosumerNic = obj.optString("prosumerNic", session.getUserNic())

        currentAllocatedSlots.clear()
        val slotsArr = obj.optJSONArray("allocatedSlotIds")
        if (slotsArr != null) {
            for (i in 0 until slotsArr.length()) {
                currentAllocatedSlots.add(slotsArr.getString(i))
            }
        }

        val currentAllocatedSlotNames = ArrayList<String>()
        val slotNamesArr = obj.optJSONArray("allocatedSlotNames")
        if (slotNamesArr != null) {
            for (i in 0 until slotNamesArr.length()) {
                currentAllocatedSlotNames.add(slotNamesArr.getString(i))
            }
        }

        // Format Date
        val displayDate = if (currentDateStr.length >= 10) currentDateStr.substring(0, 10) else currentDateStr
        val displayTimeWindow = if (currentStartTime.isNotEmpty() && currentEndTime.isNotEmpty()) {
            "$currentStartTime - $currentEndTime"
        } else {
            "Standard Window"
        }

        val displaySlots = if (currentAllocatedSlotNames.isNotEmpty()) {
            currentAllocatedSlotNames.joinToString(", ")
        } else if (currentAllocatedSlots.isNotEmpty()) {
            "${currentAllocatedSlots.size} slot${if (currentAllocatedSlots.size > 1) "s" else ""}"
        } else if (currentSlotId.isNotEmpty()) {
            "Slot #1"
        } else {
            "Dynamic Auto-Allocation"
        }

        // Status Badge styling
        tvDetailStatusBadge.text = currentStatus
        val badgeColor = when (currentStatus.lowercase()) {
            "approved" -> ContextCompat.getColor(this, R.color.status_approved)
            "pending" -> ContextCompat.getColor(this, R.color.status_pending)
            "completed" -> ContextCompat.getColor(this, R.color.status_completed)
            "cancelled" -> ContextCompat.getColor(this, R.color.status_cancelled)
            else -> ContextCompat.getColor(this, R.color.text_primary)
        }
        tvDetailStatusBadge.setTextColor(badgeColor)

        // Specifications list
        val specs = StringBuilder()
            .append("• Prosumer NIC: ").append(prosumerNic).append("\n")
            .append("• Scheduled Date: ").append(displayDate).append("\n")
            .append("• Time Window: ").append(displayTimeWindow).append("\n")
            .append("• Battery Storage Slots: ").append(displaySlots).append("\n")
            .append("• Energy Transfer Amount: ").append(currentEnergyKWh).append(" kWh\n")
            .append("• Current Status: ").append(currentStatus)
        tvDetailInfo.text = specs.toString()

        // Secure QR Code Dispatch logic
        if (currentStatus.equals("Approved", ignoreCase = true) && currentQrData.isNotEmpty()) {
            cardQrPass.visibility = View.VISIBLE
            cardQrContainer.visibility = View.VISIBLE
            tvQrTitle.text = "⚡ Secure Transaction QR Pass"
            tvQrToken.text = currentQrData
            btnCopyToken.visibility = View.VISIBLE
            tvQrNotice.text = "Show this secure QR code to the Grid Operator at the microgrid station for instant verification and energy transfer."
            generateQrImage(currentQrData)
        } else if (currentStatus.equals("Pending", ignoreCase = true)) {
            cardQrPass.visibility = View.VISIBLE
            cardQrContainer.visibility = View.GONE
            btnCopyToken.visibility = View.GONE
            tvQrTitle.text = "⏳ Awaiting Grid Operator Approval"
            tvQrToken.text = "Your booking request is pending. Once approved, your QR pass will automatically activate here."
            tvQrNotice.text = "Grid operators verify station battery slot capacity before approving."
        } else {
            cardQrPass.visibility = View.GONE
        }

        // Action Buttons Visibility
        val isFinalized = currentStatus.equals("Completed", ignoreCase = true) ||
                currentStatus.equals("Cancelled", ignoreCase = true)

        if (isFinalized) {
            btnModify.visibility = View.GONE
            btnCancel.visibility = View.GONE
        } else {
            btnModify.visibility = View.VISIBLE
            btnCancel.visibility = View.VISIBLE
        }
    }

    // Generate QR code bitmap with high clarity
    private fun generateQrImage(data: String) {
        try {
            val barcodeEncoder = BarcodeEncoder()
            val bitmap: Bitmap = barcodeEncoder.encodeBitmap(data, BarcodeFormat.QR_CODE, 500, 500)
            ivQrCode.setImageBitmap(bitmap)
        } catch (_: Exception) { }
    }

    // Show dialog to modify / reschedule energy booking (Date, Time Window & kWh)
    private fun showModifyDialog() {
        val dialogView = LayoutInflater.from(this).inflate(R.layout.activity_create_reservation, null)

        // Hide node selector in modification mode to keep station consistent
        val spinnerNodes = dialogView.findViewById<View>(R.id.spinnerNodes)
        (spinnerNodes.parent as? View)?.visibility = View.GONE

        val cardAvailabilityStatus = dialogView.findViewById<View>(R.id.cardAvailabilityStatus)
        cardAvailabilityStatus?.visibility = View.VISIBLE
        val hourlyContainer = dialogView.findViewById<LinearLayout>(R.id.llHourlySlotsContainer)
        val slotsContainer = dialogView.findViewById<LinearLayout>(R.id.llSlotsListContainer)

        val etDate = dialogView.findViewById<EditText>(R.id.etDate)
        val etStartTime = dialogView.findViewById<EditText>(R.id.etStartTime)
        val etEndTime = dialogView.findViewById<EditText>(R.id.etEndTime)
        val etEnergyKWh = dialogView.findViewById<EditText>(R.id.etEnergyKWh)
        val tvSelectedSlotsCount = dialogView.findViewById<TextView>(R.id.tvSelectedSlotsCount)
        val tvCalculatedEnergyTotal = dialogView.findViewById<TextView>(R.id.tvCalculatedEnergyTotal)
        val btnSubmit = dialogView.findViewById<Button>(R.id.btnSubmitReservation)

        val cal = Calendar.getInstance()
        val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        if (currentDateStr.length >= 10) {
            etDate.setText(currentDateStr.substring(0, 10))
        }
        val initStart = if (currentStartTime.isNotEmpty()) currentStartTime else "08:00"
        etStartTime.setText(initStart)
        val startParts = initStart.split(":")
        val sH = startParts[0].toIntOrNull() ?: 8
        val sM = if (startParts.size > 1) startParts[1].toIntOrNull() ?: 0 else 0
        val endH = sH + 1
        val initEnd = if (endH >= 24) "24:00" else String.format(Locale.US, "%02d:%02d", endH, sM)
        etEndTime.setText(initEnd)
        etEnergyKWh.setText(currentEnergyKWh.toString())

        btnSubmit.text = "Save Updated Reservation"

        val modifySlots = ArrayList<BatterySlotUI>()
        val selectedModifySlotIds = HashSet<String>(currentAllocatedSlots)
        if (selectedModifySlotIds.isEmpty() && currentSlotId.isNotEmpty()) {
            selectedModifySlotIds.add(currentSlotId)
        }

        fun updateModifyEnergyTotal() {
            val total = modifySlots
                .filter { selectedModifySlotIds.contains(it.id) }
                .sumOf { it.capacityKWh }
            tvSelectedSlotsCount.text = "${selectedModifySlotIds.size} slot(s) selected"
            tvCalculatedEnergyTotal.text = String.format(Locale.US, "%.1f kWh", total)
            etEnergyKWh.setText(String.format(Locale.US, "%.1f", total))
        }

        fun renderModifySlots() {
            slotsContainer.removeAllViews()
            if (modifySlots.isEmpty()) {
                val empty = TextView(this).apply {
                    text = "No battery slots available for this hour"
                    textSize = 12f
                    setTextColor(ContextCompat.getColor(this@ReservationDetailActivity, R.color.text_secondary))
                    setPadding(8, 12, 8, 12)
                }
                slotsContainer.addView(empty)
                return
            }
            modifySlots.forEach { slot ->
                val selected = selectedModifySlotIds.contains(slot.id)
                val card = MaterialCardView(this).apply {
                    radius = 20f
                    strokeWidth = if (selected) 3 else 1
                    strokeColor = if (selected) Color.parseColor("#006D44")
                    else ContextCompat.getColor(this@ReservationDetailActivity, R.color.card_border)
                    setCardBackgroundColor(
                        if (selected) Color.parseColor("#D1FAE5")
                        else ContextCompat.getColor(this@ReservationDetailActivity, R.color.card_background)
                    )
                    alpha = if (slot.isAvailable || selected) 1f else 0.5f
                    layoutParams = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                    ).apply {
                        setMargins(0, 0, 0, 10)
                    }
                    setOnClickListener {
                        if (!slot.isAvailable && !selected) return@setOnClickListener
                        if (selected) selectedModifySlotIds.remove(slot.id) else selectedModifySlotIds.add(slot.id)
                        updateModifyEnergyTotal()
                        renderModifySlots()
                    }
                }

                val content = LinearLayout(this).apply {
                    orientation = LinearLayout.VERTICAL
                    setPadding(20, 16, 20, 16)
                }
                val header = LinearLayout(this).apply {
                    orientation = LinearLayout.HORIZONTAL
                    gravity = android.view.Gravity.CENTER_VERTICAL
                }
                val title = TextView(this).apply {
                    text = "🔋 Slot #${slot.slotNumber}"
                    textSize = 14f
                    setTypeface(null, android.graphics.Typeface.BOLD)
                    setTextColor(
                        if (selected) Color.parseColor("#006D44")
                        else ContextCompat.getColor(this@ReservationDetailActivity, R.color.text_primary)
                    )
                    layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
                }
                val badge = TextView(this).apply {
                    text = when {
                        selected -> "SELECTED"
                        !slot.isAvailable -> "UNAVAILABLE"
                        else -> "AVAILABLE"
                    }
                    textSize = 10f
                    setTypeface(null, android.graphics.Typeface.BOLD)
                    setTextColor(
                        when {
                            selected -> Color.parseColor("#006D44")
                            !slot.isAvailable -> Color.parseColor("#B45309")
                            else -> Color.parseColor("#059669")
                        }
                    )
                }
                header.addView(title)
                header.addView(badge)
                content.addView(header)
                val capacity = TextView(this).apply {
                    text = String.format(Locale.US, "%.1f kWh capacity", slot.capacityKWh)
                    textSize = 13f
                    setTextColor(ContextCompat.getColor(this@ReservationDetailActivity, R.color.text_secondary))
                    setPadding(0, 6, 0, 0)
                }
                content.addView(capacity)
                card.addView(content)
                slotsContainer.addView(card)
            }
        }

        fun loadModifyWindow() {
            val nodeId = currentNodeId
            val date = etDate.text.toString().trim()
            val start = etStartTime.text.toString().trim()
            val end = etEndTime.text.toString().trim()
            if (nodeId.isEmpty() || date.isEmpty() || start.isEmpty() || end.isEmpty()) return

            ApiClient.request(
                "reservation/availability?nodeId=$nodeId&date=$date&startTime=$start&endTime=$end",
                "GET",
                null,
                session.getToken(),
                object : ApiClient.ApiCallback {
                    override fun onSuccess(response: String) {
                        try {
                            val obj = JSONObject(response)
                            val slots = obj.optJSONArray("slots")
                            modifySlots.clear()
                            if (slots != null) {
                                for (i in 0 until slots.length()) {
                                    val slot = slots.getJSONObject(i)
                                    modifySlots.add(
                                        BatterySlotUI(
                                            id = slot.optString("id", ""),
                                            slotNumber = slot.optInt("slotNumber", i + 1),
                                            capacityKWh = slot.optDouble("capacityKWh", 0.0),
                                            status = slot.optString("status", "Available"),
                                            isBooked = slot.optBoolean("isBooked", false),
                                            isAvailable = slot.optBoolean("isAvailable", false) ||
                                                selectedModifySlotIds.contains(slot.optString("id", ""))
                                        )
                                    )
                                }
                            }
                            runOnUiThread {
                                updateModifyEnergyTotal()
                                renderModifySlots()
                            }
                        } catch (_: Exception) {
                            runOnUiThread {
                                modifySlots.clear()
                                updateModifyEnergyTotal()
                                renderModifySlots()
                            }
                        }
                    }

                    override fun onError(error: String) {
                        runOnUiThread {
                            modifySlots.clear()
                            updateModifyEnergyTotal()
                            renderModifySlots()
                        }
                    }
                }
            )
        }

        fun loadModifyHourly() {
            val date = etDate.text.toString().trim()
            if (currentNodeId.isEmpty() || date.isEmpty()) return
            ApiClient.request(
                "reservation/availability/hourly?nodeId=$currentNodeId&date=$date",
                "GET",
                null,
                session.getToken(),
                object : ApiClient.ApiCallback {
                    override fun onSuccess(response: String) {
                        try {
                            val slots = JSONObject(response).optJSONArray("hourlySlots")
                            hourlyContainer.removeAllViews()
                            if (slots != null) {
                                for (i in 0 until slots.length()) {
                                    val slot = slots.getJSONObject(i)
                                    if (!slot.optBoolean("isWithinOperatingHours", false) ||
                                        slot.optDouble("availableKWh", 0.0) <= 0
                                    ) continue
                                    val slotStart = slot.optString("startTime", "")
                                    val slotEnd = slot.optString("endTime", "")
                                    val selected = etStartTime.text.toString() == slotStart &&
                                        etEndTime.text.toString() == slotEnd
                                    val item = TextView(this@ReservationDetailActivity).apply {
                                        text = "$slotStart - $slotEnd  •  ${slot.optDouble("availableKWh", 0.0)} kWh"
                                        textSize = 13f
                                        setTextColor(ContextCompat.getColor(this@ReservationDetailActivity, R.color.text_primary))
                                        setPadding(16, 16, 16, 16)
                                        setBackgroundColor(
                                            ContextCompat.getColor(
                                                this@ReservationDetailActivity,
                                                if (selected) R.color.md_theme_light_primaryContainer else R.color.card_background
                                            )
                                        )
                                        setOnClickListener {
                                            selectedModifySlotIds.clear()
                                            etStartTime.setText(slotStart)
                                            etEndTime.setText(slotEnd)
                                            loadModifyWindow()
                                            loadModifyHourly()
                                        }
                                    }
                                    hourlyContainer.addView(item)
                                }
                            }
                            runOnUiThread { loadModifyWindow() }
                        } catch (_: Exception) { }
                    }

                    override fun onError(error: String) {
                        runOnUiThread { hourlyContainer.removeAllViews() }
                    }
                }
            )
        }

        val dialog = AlertDialog.Builder(this)
            .setTitle("Modify Reservation")
            .setView(dialogView)
            .setNegativeButton("Cancel", null)
            .create()

        etDate.setOnClickListener {
            val maxCal = Calendar.getInstance()
            maxCal.add(Calendar.DAY_OF_YEAR, 7)

            val dpd = DatePickerDialog(
                this,
                { _, year, month, dayOfMonth ->
                    cal.set(Calendar.YEAR, year)
                    cal.set(Calendar.MONTH, month)
                    cal.set(Calendar.DAY_OF_MONTH, dayOfMonth)
                    etDate.setText(sdf.format(cal.time))
                    selectedModifySlotIds.clear()
                    loadModifyHourly()
                },
                cal.get(Calendar.YEAR),
                cal.get(Calendar.MONTH),
                cal.get(Calendar.DAY_OF_MONTH)
            )
            dpd.datePicker.minDate = System.currentTimeMillis()
            dpd.datePicker.maxDate = maxCal.timeInMillis
            dpd.show()
        }

        etStartTime.setOnClickListener {
            val currentParts = etStartTime.text.toString().split(":")
            val h = if (currentParts.size == 2) currentParts[0].toIntOrNull() ?: 8 else 8
            val m = if (currentParts.size == 2) currentParts[1].toIntOrNull() ?: 0 else 0
            TimePickerDialog(this, { _, hour, minute ->
                val newStart = String.format(Locale.US, "%02d:%02d", hour, minute)
                val newEndH = hour + 1
                val newEnd = if (newEndH >= 24) "24:00" else String.format(Locale.US, "%02d:%02d", newEndH, minute)
                etStartTime.setText(newStart)
                etEndTime.setText(newEnd)
                selectedModifySlotIds.clear()
                loadModifyWindow()
                loadModifyHourly()
            }, h, m, true).show()
        }

        btnSubmit.setOnClickListener {
            val newDateStr = etDate.text.toString().trim()
            val newStartStr = etStartTime.text.toString().trim()
            val newEndStr = etEndTime.text.toString().trim()
            val newKwhStr = etEnergyKWh.text.toString().trim()

            if (newDateStr.isEmpty() || newStartStr.isEmpty() || newEndStr.isEmpty() || newKwhStr.isEmpty()) {
                Toast.makeText(this, "Please enter all fields", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            if (newStartStr >= newEndStr) {
                Toast.makeText(this, "End time must be after start time", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            val newKwh = newKwhStr.toDoubleOrNull()
            if (newKwh == null || newKwh <= 0) {
                Toast.makeText(this, "Energy must be greater than 0 kWh", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            if (selectedModifySlotIds.isEmpty()) {
                Toast.makeText(this, "Select at least one available battery slot", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            try {
                val updateBody = JSONObject().apply {
                    put("reservationDate", "${newDateStr}T00:00:00Z")
                    put("startTime", newStartStr)
                    put("endTime", newEndStr)
                    put("energyKWh", newKwh)
                    val selectedSlots = JSONArray()
                    selectedModifySlotIds.forEach { selectedSlots.put(it) }
                    if (selectedSlots.length() > 0) {
                        put("selectedSlotIds", selectedSlots)
                    }
                }

                ApiClient.request("reservation/$resId", "PUT", updateBody, session.getToken(), object : ApiClient.ApiCallback {
                    override fun onSuccess(response: String) {
                        Toast.makeText(this@ReservationDetailActivity, "Reservation updated successfully!", Toast.LENGTH_SHORT).show()
                        dialog.dismiss()
                        loadDetail()
                    }

                    override fun onError(error: String) {
                        Toast.makeText(this@ReservationDetailActivity, "Update failed: $error", Toast.LENGTH_LONG).show()
                    }
                })
            } catch (e: Exception) {
                Toast.makeText(this, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }

        loadModifyHourly()
        updateModifyEnergyTotal()
        dialog.show()
    }

    // Confirm and cancel booking enforcing 12-hour rule
    private fun cancelBooking() {
        AlertDialog.Builder(this)
            .setTitle("Cancel Reservation")
            .setMessage("Are you sure you want to cancel this booking?\n\nNotice: In accordance with microgrid trading policies, cancellations require at least 12 hours' notice before scheduled slot time.")
            .setPositiveButton("Confirm Cancellation") { _, _ ->
                ApiClient.request("reservation/$resId/cancel", "PUT", null, session.getToken(), object : ApiClient.ApiCallback {
                    override fun onSuccess(response: String) {
                        session.dbHelper.updateCachedReservationStatus(resId ?: "", "Cancelled")
                        AlertDialog.Builder(this@ReservationDetailActivity)
                            .setTitle("Booking Cancelled")
                            .setMessage("Your reservation has been cancelled. Allocated battery storage slots have been released.")
                            .setPositiveButton("OK") { _, _ -> loadDetail() }
                            .show()
                    }

                    override fun onError(error: String) {
                        AlertDialog.Builder(this@ReservationDetailActivity)
                            .setTitle("Cancellation Failed")
                            .setMessage(error)
                            .setPositiveButton("Dismiss", null)
                            .show()
                    }
                })
            }
            .setNegativeButton("Keep Booking", null)
            .show()
    }
}
