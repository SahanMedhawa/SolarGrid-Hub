package com.smartsolar.microgrid.ui.prosumer

import android.app.DatePickerDialog
import android.app.TimePickerDialog
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.google.android.material.card.MaterialCardView
import com.smartsolar.microgrid.R
import com.smartsolar.microgrid.api.ApiClient
import com.smartsolar.microgrid.data.SessionManager
import com.smartsolar.microgrid.models.MicrogridNode
import com.smartsolar.microgrid.models.Reservation
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

/**
 * Create Reservation Activity - allows prosumers to choose actual physical battery
 * slots of a microgrid station to reserve capacity.
 * Enforces the 7-day scheduling window, operating hours, and time-window capacity evaluation.
 */
class CreateReservationActivity : AppCompatActivity() {

    data class BatterySlotUI(
        val id: String,
        val slotNumber: Int,
        val capacityKWh: Double,
        val status: String,
        val isBooked: Boolean,
        val isAvailable: Boolean
    )

    private lateinit var spinnerNodes: Spinner
    private lateinit var etDate: EditText
    private lateinit var etStartTime: EditText
    private lateinit var etEndTime: EditText
    private lateinit var etEnergyKWh: EditText
    private lateinit var tvOperatingHours: TextView
    private lateinit var tvAvailabilityFeedback: TextView
    private lateinit var llSlotsListContainer: LinearLayout
    private lateinit var tvSelectedSlotsCount: TextView
    private lateinit var tvCalculatedEnergyTotal: TextView
    private lateinit var session: SessionManager

    private val nodesList = ArrayList<MicrogridNode>()
    private val nodeDisplayNames = ArrayList<String>()
    private val selectedCalendar: Calendar = Calendar.getInstance()

    private val availableSlotsList = ArrayList<BatterySlotUI>()
    private val selectedSlotIds = HashSet<String>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        session = SessionManager(this)
        setContentView(R.layout.activity_create_reservation)

        spinnerNodes = findViewById(R.id.spinnerNodes)
        etDate = findViewById(R.id.etDate)
        etStartTime = findViewById(R.id.etStartTime)
        etEndTime = findViewById(R.id.etEndTime)
        etEnergyKWh = findViewById(R.id.etEnergyKWh)
        tvOperatingHours = findViewById(R.id.tvOperatingHours)
        tvAvailabilityFeedback = findViewById(R.id.tvAvailabilityFeedback)
        llSlotsListContainer = findViewById(R.id.llSlotsListContainer)
        tvSelectedSlotsCount = findViewById(R.id.tvSelectedSlotsCount)
        tvCalculatedEnergyTotal = findViewById(R.id.tvCalculatedEnergyTotal)
        val btnSubmit: Button = findViewById(R.id.btnSubmitReservation)

        // Set default time window: 08:00 - 09:00 (strictly 1-hour reservation)
        etStartTime.setText("08:00")
        etEndTime.setText("09:00")

        etDate.setOnClickListener { showDatePicker() }
        etStartTime.setOnClickListener { showStartTimePicker() }
        etEndTime.setOnClickListener {
            Toast.makeText(this, "Every energy reservation is exactly 1 hour. Tap Start Time to select.", Toast.LENGTH_SHORT).show()
        }
        btnSubmit.setOnClickListener { submitBooking() }

        spinnerNodes.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                if (position in nodesList.indices) {
                    val node = nodesList[position]
                    val sched = if (node.schedule.isNotEmpty()) node.schedule else "06:00-18:00"
                    tvOperatingHours.text = "Operating Hours: $sched"
                    loadStationSlotsDirectly(node.id)
                    checkAvailability()
                }
            }
            override fun onNothingSelected(parent: AdapterView<*>?) {}
        }

        loadActiveNodes()
    }

    // Show date picker with 7-day maximum constraint
    private fun showDatePicker() {
        val maxCal = Calendar.getInstance()
        maxCal.add(Calendar.DAY_OF_YEAR, 7) // 7-day rule constraint

        val datePickerDialog = DatePickerDialog(
            this,
            { _, year, month, dayOfMonth ->
                selectedCalendar.set(Calendar.YEAR, year)
                selectedCalendar.set(Calendar.MONTH, month)
                selectedCalendar.set(Calendar.DAY_OF_MONTH, dayOfMonth)
                val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
                etDate.setText(sdf.format(selectedCalendar.time))
                checkAvailability()
            },
            selectedCalendar.get(Calendar.YEAR),
            selectedCalendar.get(Calendar.MONTH),
            selectedCalendar.get(Calendar.DAY_OF_MONTH)
        )

        datePickerDialog.datePicker.minDate = System.currentTimeMillis()
        datePickerDialog.datePicker.maxDate = maxCal.timeInMillis
        datePickerDialog.show()
    }

    // Show time picker for Start time and automatically set End time to exactly 1 hour later
    private fun showStartTimePicker() {
        val currentText = etStartTime.text.toString().trim()
        val parts = currentText.split(":")
        val defaultHour = if (parts.size == 2) parts[0].toIntOrNull() ?: 8 else 8
        val defaultMin = if (parts.size == 2) parts[1].toIntOrNull() ?: 0 else 0

        val timePickerDialog = TimePickerDialog(
            this,
            { _, hourOfDay, minute ->
                val startFormatted = String.format(Locale.US, "%02d:%02d", hourOfDay, minute)
                val endHour = hourOfDay + 1
                val endFormatted = if (endHour >= 24) "24:00" else String.format(Locale.US, "%02d:%02d", endHour, minute)
                etStartTime.setText(startFormatted)
                etEndTime.setText(endFormatted)
                checkAvailability()
            },
            defaultHour,
            defaultMin,
            true // 24 hour view
        )
        timePickerDialog.show()
    }

    // Load active microgrid nodes from the central API
    private fun loadActiveNodes() {
        ApiClient.request("microgridnode/active", "GET", null, session.getToken(), object : ApiClient.ApiCallback {
            override fun onSuccess(response: String) {
                try {
                    val arr = JSONArray(response)
                    nodesList.clear()
                    nodeDisplayNames.clear()

                    for (i in 0 until arr.length()) {
                        val obj = arr.getJSONObject(i)
                        val node = MicrogridNode(
                            id = obj.getString("id"),
                            nodeName = obj.optString("nodeName", "Node"),
                            location = obj.optString("location", ""),
                            capacityKWh = obj.optDouble("capacityKWh", 100.0),
                            batterySlots = obj.optInt("batterySlots", 8),
                            availableBatterySlots = obj.optInt("availableBatterySlots", 8),
                            schedule = obj.optString("schedule", "06:00-18:00"),
                            isActive = obj.optBoolean("isActive", true)
                        )
                        nodesList.add(node)
                        nodeDisplayNames.add("${node.nodeName} (${node.location}) — ${node.capacityKWh} kWh capacity")
                    }

                    val adapter = ArrayAdapter(
                        this@CreateReservationActivity,
                        android.R.layout.simple_spinner_dropdown_item,
                        nodeDisplayNames
                    )
                    spinnerNodes.adapter = adapter

                    if (nodesList.isNotEmpty()) {
                        val requestedNodeId = intent.getStringExtra("nodeId")
                        val requestedIndex = nodesList.indexOfFirst { it.id == requestedNodeId }
                        if (requestedIndex >= 0) spinnerNodes.setSelection(requestedIndex)
                        val firstNode = nodesList[0]
                        val sched = if (firstNode.schedule.isNotEmpty()) firstNode.schedule else "06:00-18:00"
                        tvOperatingHours.text = "Operating Hours: $sched"
                    }
                } catch (_: Exception) { }
            }

            override fun onError(error: String) {
                Toast.makeText(this@CreateReservationActivity, "Failed to load nodes: $error", Toast.LENGTH_SHORT).show()
            }
        })
    }

    // Query actual station battery slots directly upon station selection
    private fun loadStationSlotsDirectly(nodeId: String) {
        ApiClient.request("energyslot/node/$nodeId", "GET", null, session.getToken(), object : ApiClient.ApiCallback {
            override fun onSuccess(response: String) {
                try {
                    val arr = JSONArray(response)
                    availableSlotsList.clear()
                    selectedSlotIds.clear()
                    for (i in 0 until arr.length()) {
                        val sObj = arr.getJSONObject(i)
                        val status = sObj.optString("status", "Available")
                        val isMaint = status.equals("Maintenance", ignoreCase = true)
                        availableSlotsList.add(
                            BatterySlotUI(
                                id = sObj.optString("id", ""),
                                slotNumber = sObj.optInt("slotNumber", i + 1),
                                capacityKWh = sObj.optDouble("availableKWh", 0.0),
                                status = status,
                                isBooked = false,
                                isAvailable = !isMaint
                            )
                        )
                    }
                    runOnUiThread {
                        renderSlotsUI()
                        updateCalculatedEnergyDisplay()
                    }
                } catch (_: Exception) {}
            }
            override fun onError(error: String) {}
        })
    }

    // Query real-time availability evaluation from backend for the selected node, date, and time window
    private fun checkAvailability() {
        if (nodesList.isEmpty() || spinnerNodes.selectedItemPosition !in nodesList.indices) return
        val dateStr = etDate.text.toString().trim()
        val startStr = etStartTime.text.toString().trim()
        val endStr = etEndTime.text.toString().trim()

        if (dateStr.isEmpty() || startStr.isEmpty() || endStr.isEmpty()) return

        if (startStr >= endStr) {
            tvAvailabilityFeedback.text = "⚠️ End time must be after start time."
            tvAvailabilityFeedback.setTextColor(ContextCompat.getColor(this, R.color.status_cancelled))
            return
        }

        val selectedNode = nodesList[spinnerNodes.selectedItemPosition]
        val endpoint = "reservation/availability?nodeId=${selectedNode.id}&date=${dateStr}&startTime=${startStr}&endTime=${endStr}"

        ApiClient.request(endpoint, "GET", null, session.getToken(), object : ApiClient.ApiCallback {
            override fun onSuccess(response: String) {
                try {
                    val obj = JSONObject(response)
                    val availableKWh = obj.optDouble("availableKWh", 0.0)
                    val isWithinHours = obj.optBoolean("isWithinOperatingHours", true)
                    val operatingSchedule = obj.optString("schedule", selectedNode.schedule)

                    val slotsArr = obj.optJSONArray("slots")
                    if (slotsArr != null && slotsArr.length() > 0) {
                        availableSlotsList.clear()
                        for (i in 0 until slotsArr.length()) {
                            val sObj = slotsArr.getJSONObject(i)
                            availableSlotsList.add(
                                BatterySlotUI(
                                    id = sObj.optString("id", ""),
                                    slotNumber = sObj.optInt("slotNumber", i + 1),
                                    capacityKWh = sObj.optDouble("capacityKWh", 0.0),
                                    status = sObj.optString("status", "Available"),
                                    isBooked = sObj.optBoolean("isBooked", false),
                                    isAvailable = sObj.optBoolean("isAvailable", true)
                                )
                            )
                        }
                        // Remove selected slots that are no longer available in this window
                        val validIds = availableSlotsList.filter { it.isAvailable }.map { it.id }.toSet()
                        selectedSlotIds.retainAll(validIds)
                    }

                    runOnUiThread {
                        if (!isWithinHours) {
                            tvAvailabilityFeedback.text = "⚠️ Selected window is outside station operating hours ($operatingSchedule)."
                            tvAvailabilityFeedback.setTextColor(ContextCompat.getColor(this@CreateReservationActivity, R.color.status_cancelled))
                        } else if (availableKWh <= 0) {
                            tvAvailabilityFeedback.text = "⚠️ Station fully booked or under maintenance during this time window."
                            tvAvailabilityFeedback.setTextColor(ContextCompat.getColor(this@CreateReservationActivity, R.color.status_cancelled))
                        } else {
                            tvAvailabilityFeedback.text = "⚡ Available in this window: $availableKWh kWh across station slots. Tap slots below to select."
                            tvAvailabilityFeedback.setTextColor(ContextCompat.getColor(this@CreateReservationActivity, R.color.primary))
                        }
                        renderSlotsUI()
                        updateCalculatedEnergyDisplay()
                    }
                } catch (_: Exception) {}
            }

            override fun onError(error: String) {
                runOnUiThread {
                    tvAvailabilityFeedback.text = "Choose slots below to configure your energy drop-off."
                    tvAvailabilityFeedback.setTextColor(ContextCompat.getColor(this@CreateReservationActivity, R.color.text_secondary))
                }
            }
        })
    }

    // Render physical battery slot selection cards
    private fun renderSlotsUI() {
        llSlotsListContainer.removeAllViews()

        if (availableSlotsList.isEmpty()) {
            val tv = TextView(this).apply {
                text = "No battery storage slots found for this station."
                textSize = 12f
                setPadding(20, 20, 20, 20)
                setTextColor(ContextCompat.getColor(this@CreateReservationActivity, R.color.text_secondary))
            }
            llSlotsListContainer.addView(tv)
            return
        }

        for (slot in availableSlotsList) {
            val isSelected = selectedSlotIds.contains(slot.id)
            val card = MaterialCardView(this).apply {
                radius = 24f
                strokeWidth = 2
                val params = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    setMargins(0, 0, 0, 16)
                }
                layoutParams = params

                if (isSelected) {
                    setCardBackgroundColor(Color.parseColor("#D1FAE5"))
                    strokeColor = Color.parseColor("#006D44")
                } else if (slot.status.equals("Maintenance", ignoreCase = true)) {
                    setCardBackgroundColor(Color.parseColor("#FEE2E2"))
                    strokeColor = Color.parseColor("#EF4444")
                    alpha = 0.55f
                } else if (slot.isBooked) {
                    setCardBackgroundColor(Color.parseColor("#FEF3C7"))
                    strokeColor = Color.parseColor("#F59E0B")
                    alpha = 0.55f
                } else {
                    setCardBackgroundColor(ContextCompat.getColor(this@CreateReservationActivity, R.color.card_background))
                    strokeColor = ContextCompat.getColor(this@CreateReservationActivity, R.color.card_border)
                    alpha = 1.0f
                }
            }

            val itemLayout = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(28, 20, 28, 20)
            }

            val topRow = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = android.view.Gravity.CENTER_VERTICAL
            }

            val tvTitle = TextView(this).apply {
                text = "🔋 Slot #${slot.slotNumber}"
                textSize = 14f
                setTypeface(null, android.graphics.Typeface.BOLD)
                setTextColor(if (isSelected) Color.parseColor("#006D44") else ContextCompat.getColor(this@CreateReservationActivity, R.color.text_primary))
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f)
            }

            val tvBadge = TextView(this).apply {
                textSize = 11f
                setTypeface(null, android.graphics.Typeface.BOLD)
                setPadding(12, 4, 12, 4)
                if (isSelected) {
                    text = "✓ SELECTED"
                    setTextColor(Color.parseColor("#006D44"))
                } else if (slot.status.equals("Maintenance", ignoreCase = true)) {
                    text = "🔧 MAINTENANCE"
                    setTextColor(Color.parseColor("#EF4444"))
                } else if (slot.isBooked) {
                    text = "⏳ BOOKED"
                    setTextColor(Color.parseColor("#D97706"))
                } else {
                    text = "● AVAILABLE"
                    setTextColor(Color.parseColor("#059669"))
                }
            }

            topRow.addView(tvTitle)
            topRow.addView(tvBadge)

            val tvCapacity = TextView(this).apply {
                text = "${slot.capacityKWh} kWh Capacity"
                textSize = 13f
                setTextColor(ContextCompat.getColor(this@CreateReservationActivity, R.color.text_secondary))
                setPadding(0, 6, 0, 0)
            }

            itemLayout.addView(topRow)
            itemLayout.addView(tvCapacity)
            card.addView(itemLayout)

            if (slot.isAvailable) {
                card.isClickable = true
                card.isFocusable = true
                card.setOnClickListener {
                    if (selectedSlotIds.contains(slot.id)) {
                        selectedSlotIds.remove(slot.id)
                    } else {
                        selectedSlotIds.add(slot.id)
                    }
                    renderSlotsUI()
                    updateCalculatedEnergyDisplay()
                }
            } else {
                card.isClickable = false
            }

            llSlotsListContainer.addView(card)
        }
    }

    private fun updateCalculatedEnergyDisplay() {
        val totalKWh = availableSlotsList
            .filter { selectedSlotIds.contains(it.id) }
            .sumOf { it.capacityKWh }

        tvSelectedSlotsCount.text = "CALCULATED ENERGY TO SUPPLY (${selectedSlotIds.size} SLOTS SELECTED)"
        tvCalculatedEnergyTotal.text = String.format(Locale.US, "%.1f kWh", totalKWh)
        etEnergyKWh.setText(String.format(Locale.US, "%.1f", totalKWh))
    }

    // Validate inputs and submit the reservation
    private fun submitBooking() {
        if (nodesList.isEmpty() || spinnerNodes.selectedItemPosition < 0) {
            Toast.makeText(this, "Please select a grid node", Toast.LENGTH_SHORT).show()
            return
        }

        val selectedNode = nodesList[spinnerNodes.selectedItemPosition]
        val dateStr = etDate.text.toString().trim()
        val startStr = etStartTime.text.toString().trim()
        val endStr = etEndTime.text.toString().trim()

        if (dateStr.isEmpty() || startStr.isEmpty() || endStr.isEmpty()) {
            Toast.makeText(this, "Please select date and time window", Toast.LENGTH_SHORT).show()
            return
        }

        if (startStr >= endStr) {
            Toast.makeText(this, "End time must be after start time", Toast.LENGTH_SHORT).show()
            return
        }

        // Validate station operating hours
        val sched = if (selectedNode.schedule.isNotEmpty()) selectedNode.schedule else "06:00-18:00"
        val schedParts = sched.split("-")
        if (schedParts.size == 2) {
            val schedStart = schedParts[0].trim()
            val schedEnd = schedParts[1].trim()
            if (startStr < schedStart || endStr > schedEnd) {
                Toast.makeText(this, "Reservation ($startStr - $endStr) must remain within station operating schedule ($sched)", Toast.LENGTH_LONG).show()
                return
            }
        }

        if (selectedSlotIds.isEmpty()) {
            Toast.makeText(this, "Please tap at least one available battery slot to allocate capacity", Toast.LENGTH_SHORT).show()
            return
        }

        val totalKWh = availableSlotsList
            .filter { selectedSlotIds.contains(it.id) }
            .sumOf { it.capacityKWh }

        if (totalKWh <= 0) {
            Toast.makeText(this, "Selected slot capacity must be greater than 0 kWh", Toast.LENGTH_SHORT).show()
            return
        }

        try {
            val selectedSlotsArr = JSONArray()
            for (id in selectedSlotIds) {
                selectedSlotsArr.put(id)
            }

            val req = JSONObject().apply {
                put("prosumerNic", session.getUserNic())
                put("nodeId", selectedNode.id)
                put("reservationDate", "${dateStr}T00:00:00Z")
                put("startTime", startStr)
                put("endTime", endStr)
                put("energyKWh", totalKWh)
                put("selectedSlotIds", selectedSlotsArr)
            }

            ApiClient.request("reservation", "POST", req, session.getToken(), object : ApiClient.ApiCallback {
                override fun onSuccess(response: String) {
                    var allocatedSlotsList = ArrayList<String>()
                    var createdId = ""
                    try {
                        val created = JSONObject(response)
                        createdId = created.optString("id", "")
                        val slotsArr = created.optJSONArray("allocatedSlotIds")
                        if (slotsArr != null) {
                            for (j in 0 until slotsArr.length()) {
                                allocatedSlotsList.add(slotsArr.getString(j))
                            }
                        }

                        val primarySlot = if (allocatedSlotsList.isNotEmpty()) allocatedSlotsList[0] else created.optString("slotId", "")

                        val newRes = Reservation(
                            id = createdId,
                            prosumerNic = session.getUserNic(),
                            slotId = primarySlot,
                            nodeId = selectedNode.id,
                            reservationDate = dateStr,
                            startTime = startStr,
                            endTime = endStr,
                            energyKWh = totalKWh,
                            status = "Pending",
                            allocatedSlotIds = allocatedSlotsList
                        )
                        // Cache in local SQLite
                        val list = session.dbHelper.getCachedReservations(session.getUserNic())
                        list.add(0, newRes)
                        session.dbHelper.cacheReservations(list)
                    } catch (_: Exception) {}

                    val slotsText = if (allocatedSlotsList.isNotEmpty()) {
                        "${allocatedSlotsList.joinToString(", ")} (${allocatedSlotsList.size} slot${if (allocatedSlotsList.size > 1) "s" else ""})"
                    } else {
                        "${selectedSlotsArr.length()} slot(s) selected"
                    }

                    AlertDialog.Builder(this@CreateReservationActivity)
                        .setTitle("Energy Slot Reserved! ⚡")
                        .setMessage(
                            "Booking Summary:\n" +
                            "• Station: ${selectedNode.nodeName} (${selectedNode.location})\n" +
                            "• Time Window: $startStr - $endStr\n" +
                            "• Scheduled Date: $dateStr\n" +
                            "• Transfer Energy: ${String.format(Locale.US, "%.1f", totalKWh)} kWh\n" +
                            "• Chosen Battery Slots: $slotsText\n" +
                            "• Status: Pending Approval\n\n" +
                            "Your request has been dispatched to the Grid Operator. Once approved, your secure QR transaction pass will become active."
                        )
                        .setPositiveButton("View Bookings") { _, _ -> finish() }
                        .setCancelable(false)
                        .show()
                }

                override fun onError(error: String) {
                    Toast.makeText(this@CreateReservationActivity, error, Toast.LENGTH_LONG).show()
                }
            })
        } catch (e: Exception) {
            Toast.makeText(this, "Error submitting booking: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }
}
