package com.smartsolar.microgrid.ui.prosumer

import android.app.DatePickerDialog
import android.app.TimePickerDialog
import android.os.Bundle
import android.view.View
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
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
 * Create Reservation Activity - allows prosumers to reserve energy drop-off/charging capacity.
 * Enforces the 7-day scheduling window, operating hours, and time-window capacity evaluation.
 * Battery slots are auto-allocated dynamically on the FAT server.
 */
class CreateReservationActivity : AppCompatActivity() {

    private lateinit var spinnerNodes: Spinner
    private lateinit var etDate: EditText
    private lateinit var etStartTime: EditText
    private lateinit var etEndTime: EditText
    private lateinit var etEnergyKWh: EditText
    private lateinit var tvOperatingHours: TextView
    private lateinit var tvAvailabilityFeedback: TextView
    private lateinit var session: SessionManager

    private val nodesList = ArrayList<MicrogridNode>()
    private val nodeDisplayNames = ArrayList<String>()
    private val selectedCalendar: Calendar = Calendar.getInstance()

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
        val btnSubmit: Button = findViewById(R.id.btnSubmitReservation)

        // Set default time window: 08:00 - 10:00
        etStartTime.setText("08:00")
        etEndTime.setText("10:00")

        etDate.setOnClickListener { showDatePicker() }
        etStartTime.setOnClickListener { showTimePicker(true) }
        etEndTime.setOnClickListener { showTimePicker(false) }
        btnSubmit.setOnClickListener { submitBooking() }

        spinnerNodes.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                if (position in nodesList.indices) {
                    val node = nodesList[position]
                    val sched = if (node.schedule.isNotEmpty()) node.schedule else "06:00-18:00"
                    tvOperatingHours.text = "Operating Hours: $sched"
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

    // Show time picker for Start or End time
    private fun showTimePicker(isStart: Boolean) {
        val currentText = if (isStart) etStartTime.text.toString().trim() else etEndTime.text.toString().trim()
        val parts = currentText.split(":")
        val defaultHour = if (parts.size == 2) parts[0].toIntOrNull() ?: if (isStart) 8 else 10 else if (isStart) 8 else 10
        val defaultMin = if (parts.size == 2) parts[1].toIntOrNull() ?: 0 else 0

        val timePickerDialog = TimePickerDialog(
            this,
            { _, hourOfDay, minute ->
                val timeFormatted = String.format(Locale.US, "%02d:%02d", hourOfDay, minute)
                if (isStart) {
                    etStartTime.setText(timeFormatted)
                } else {
                    etEndTime.setText(timeFormatted)
                }
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
                    val availableKWh = obj.optDouble("availableCapacityKWh", 0.0)
                    val isWithinHours = obj.optBoolean("isWithinOperatingHours", true)
                    val totalActiveSlots = obj.optInt("totalActiveSlots", 0)
                    val operatingSchedule = obj.optString("operatingSchedule", selectedNode.schedule)

                    if (!isWithinHours) {
                        tvAvailabilityFeedback.text = "⚠️ Selected window is outside station operating hours ($operatingSchedule)."
                        tvAvailabilityFeedback.setTextColor(ContextCompat.getColor(this@CreateReservationActivity, R.color.status_cancelled))
                    } else if (availableKWh <= 0) {
                        tvAvailabilityFeedback.text = "⚠️ Station fully booked or in maintenance during this time window."
                        tvAvailabilityFeedback.setTextColor(ContextCompat.getColor(this@CreateReservationActivity, R.color.status_cancelled))
                    } else {
                        tvAvailabilityFeedback.text = "⚡ Available in this window: $availableKWh kWh ($totalActiveSlots active slots open). Slots auto-allocate on booking."
                        tvAvailabilityFeedback.setTextColor(ContextCompat.getColor(this@CreateReservationActivity, R.color.primary))
                    }
                } catch (_: Exception) {}
            }

            override fun onError(error: String) {
                // Non-blocking fallback preview
                tvAvailabilityFeedback.text = "Slots are dynamically auto-allocated on booking confirmation."
                tvAvailabilityFeedback.setTextColor(ContextCompat.getColor(this@CreateReservationActivity, R.color.text_secondary))
            }
        })
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
        val kwhStr = etEnergyKWh.text.toString().trim()

        if (dateStr.isEmpty() || startStr.isEmpty() || endStr.isEmpty() || kwhStr.isEmpty()) {
            Toast.makeText(this, "Please fill in all date, time, and energy fields", Toast.LENGTH_SHORT).show()
            return
        }

        if (startStr >= endStr) {
            Toast.makeText(this, "End time must be after start time", Toast.LENGTH_SHORT).show()
            return
        }

        val kwh = try {
            kwhStr.toDouble()
        } catch (_: Exception) {
            Toast.makeText(this, "Invalid energy amount", Toast.LENGTH_SHORT).show()
            return
        }

        if (kwh <= 0) {
            Toast.makeText(this, "Energy amount must be greater than 0 kWh", Toast.LENGTH_SHORT).show()
            return
        }

        try {
            val req = JSONObject().apply {
                put("prosumerNic", session.getUserNic())
                put("nodeId", selectedNode.id)
                put("reservationDate", "${dateStr}T00:00:00Z")
                put("startTime", startStr)
                put("endTime", endStr)
                put("energyKWh", kwh)
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
                            energyKWh = kwh,
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
                        "Auto-allocated by Grid"
                    }

                    AlertDialog.Builder(this@CreateReservationActivity)
                        .setTitle("Energy Slot Reserved! ⚡")
                        .setMessage(
                            "Booking Summary:\n" +
                            "• Station: ${selectedNode.nodeName} (${selectedNode.location})\n" +
                            "• Time Window: $startStr - $endStr\n" +
                            "• Scheduled Date: $dateStr\n" +
                            "• Transfer Energy: $kwh kWh\n" +
                            "• Auto-Allocated Battery Slots: $slotsText\n" +
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
