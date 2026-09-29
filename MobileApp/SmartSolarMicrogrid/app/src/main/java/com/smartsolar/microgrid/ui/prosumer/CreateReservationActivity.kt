package com.smartsolar.microgrid.ui.prosumer

import android.app.DatePickerDialog
import android.os.Bundle
import android.view.View
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.Spinner
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
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
 * Create Reservation Activity - allows prosumers to reserve energy drop-off/charging slots.
 * Enforces the 7-day scheduling rule and node capacity constraints via interactive validation.
 */
class CreateReservationActivity : AppCompatActivity() {

    private lateinit var spinnerNodes: Spinner
    private lateinit var spinnerSlots: Spinner
    private lateinit var etDate: EditText
    private lateinit var etEnergyKWh: EditText
    private lateinit var session: SessionManager

    private val nodesList = ArrayList<MicrogridNode>()
    private val nodeDisplayNames = ArrayList<String>()
    private val slotOptions = ArrayList<String>()
    private val selectedCalendar: Calendar = Calendar.getInstance()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        session = SessionManager(this)
        setContentView(R.layout.activity_create_reservation)

        spinnerNodes = findViewById(R.id.spinnerNodes)
        spinnerSlots = findViewById(R.id.spinnerSlots)
        etDate = findViewById(R.id.etDate)
        etEnergyKWh = findViewById(R.id.etEnergyKWh)
        val btnSubmit: Button = findViewById(R.id.btnSubmitReservation)

        etDate.setOnClickListener { showDatePicker() }
        btnSubmit.setOnClickListener { submitBooking() }

        spinnerNodes.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                if (position in nodesList.indices) {
                    updateSlotOptions(nodesList[position])
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
            },
            selectedCalendar.get(Calendar.YEAR),
            selectedCalendar.get(Calendar.MONTH),
            selectedCalendar.get(Calendar.DAY_OF_MONTH)
        )

        datePickerDialog.datePicker.minDate = System.currentTimeMillis()
        datePickerDialog.datePicker.maxDate = maxCal.timeInMillis
        datePickerDialog.show()
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
                            isActive = obj.optBoolean("isActive", true)
                        )
                        nodesList.add(node)
                        nodeDisplayNames.add("${node.nodeName} (${node.location}) — ${node.availableBatterySlots} slots open")
                    }

                    val adapter = ArrayAdapter(
                        this@CreateReservationActivity,
                        android.R.layout.simple_spinner_dropdown_item,
                        nodeDisplayNames
                    )
                    spinnerNodes.adapter = adapter

                    if (nodesList.isNotEmpty()) {
                        updateSlotOptions(nodesList[0])
                    }
                } catch (_: Exception) { }
            }

            override fun onError(error: String) {
                Toast.makeText(this@CreateReservationActivity, "Failed to load nodes: $error", Toast.LENGTH_SHORT).show()
            }
        })
    }

    // Populate slot options (SLOT-01 up to total batterySlots) for the selected station
    private fun updateSlotOptions(node: MicrogridNode) {
        slotOptions.clear()
        val totalSlots = if (node.batterySlots > 0) node.batterySlots else 6
        for (i in 1..totalSlots) {
            val slotId = String.format(Locale.US, "SLOT-%02d", i)
            slotOptions.add(slotId)
        }

        val slotAdapter = ArrayAdapter(
            this@CreateReservationActivity,
            android.R.layout.simple_spinner_dropdown_item,
            slotOptions
        )
        spinnerSlots.adapter = slotAdapter
    }

    // Validate inputs and submit the reservation
    private fun submitBooking() {
        if (nodesList.isEmpty() || spinnerNodes.selectedItemPosition < 0) {
            Toast.makeText(this, "Please select a grid node", Toast.LENGTH_SHORT).show()
            return
        }

        val selectedNode = nodesList[spinnerNodes.selectedItemPosition]
        val selectedSlot = if (slotOptions.isNotEmpty() && spinnerSlots.selectedItemPosition in slotOptions.indices) {
            slotOptions[spinnerSlots.selectedItemPosition]
        } else {
            "SLOT-01"
        }

        val dateStr = etDate.text.toString().trim()
        val kwhStr = etEnergyKWh.text.toString().trim()

        if (dateStr.isEmpty() || kwhStr.isEmpty()) {
            Toast.makeText(this, "Please fill in date and energy fields", Toast.LENGTH_SHORT).show()
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

        if (kwh > selectedNode.capacityKWh) {
            Toast.makeText(this, "Requested energy exceeds node capacity (${selectedNode.capacityKWh} kWh)", Toast.LENGTH_LONG).show()
            return
        }

        try {
            val req = JSONObject().apply {
                put("prosumerNic", session.getUserNic())
                put("nodeId", selectedNode.id)
                put("slotId", selectedSlot)
                put("reservationDate", "${dateStr}T10:00:00Z")
                put("energyKWh", kwh)
            }

            ApiClient.request("reservation", "POST", req, session.getToken(), object : ApiClient.ApiCallback {
                override fun onSuccess(response: String) {
                    try {
                        val created = JSONObject(response)
                        val newRes = Reservation(
                            id = created.optString("id", ""),
                            prosumerNic = session.getUserNic(),
                            slotId = selectedSlot,
                            nodeId = selectedNode.id,
                            reservationDate = dateStr,
                            energyKWh = kwh,
                            status = "Pending"
                        )
                        // Cache in local SQLite
                        val list = session.dbHelper.getCachedReservations(session.getUserNic())
                        list.add(0, newRes)
                        session.dbHelper.cacheReservations(list)
                    } catch (_: Exception) {}

                    AlertDialog.Builder(this@CreateReservationActivity)
                        .setTitle("Energy Slot Reserved! ⚡")
                        .setMessage(
                            "Booking Summary:\n" +
                            "• Station: ${selectedNode.nodeName} (${selectedNode.location})\n" +
                            "• Slot: $selectedSlot\n" +
                            "• Scheduled Date: $dateStr\n" +
                            "• Transfer Energy: $kwh kWh\n" +
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
