package com.smartsolar.microgrid.ui.prosumer

import android.app.DatePickerDialog
import android.os.Bundle
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
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

/**
 * Create Reservation Activity - allows prosumers to reserve energy drop-off/charging slots.
 * Enforces the 7-day scheduling rule via date picker constraints.
 */
class CreateReservationActivity : AppCompatActivity() {

    private lateinit var spinnerNodes: Spinner
    private lateinit var etDate: EditText
    private lateinit var etEnergyKWh: EditText
    private lateinit var session: SessionManager
    private val nodeIds = ArrayList<String>()
    private val nodeNames = ArrayList<String>()
    private val selectedCalendar: Calendar = Calendar.getInstance()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        session = SessionManager(this)
        setContentView(R.layout.activity_create_reservation)

        spinnerNodes = findViewById(R.id.spinnerNodes)
        etDate = findViewById(R.id.etDate)
        etEnergyKWh = findViewById(R.id.etEnergyKWh)
        val btnSubmit: Button = findViewById(R.id.btnSubmitReservation)

        etDate.setOnClickListener { showDatePicker() }
        btnSubmit.setOnClickListener { submitBooking() }

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

    // Load active microgrid nodes from the central API to populate the spinner
    private fun loadActiveNodes() {
        ApiClient.request("microgridnode/active", "GET", null, session.getToken(), object : ApiClient.ApiCallback {
            override fun onSuccess(response: String) {
                try {
                    val arr = JSONArray(response)
                    nodeIds.clear()
                    nodeNames.clear()
                    for (i in 0 until arr.length()) {
                        val node = arr.getJSONObject(i)
                        nodeIds.add(node.getString("id"))
                        nodeNames.add("${node.getString("nodeName")} (${node.getString("location")})")
                    }
                    val adapter = ArrayAdapter(
                        this@CreateReservationActivity,
                        android.R.layout.simple_spinner_dropdown_item,
                        nodeNames
                    )
                    spinnerNodes.adapter = adapter
                } catch (_: Exception) { }
            }

            override fun onError(error: String) {
                Toast.makeText(this@CreateReservationActivity, "Failed to load nodes: $error", Toast.LENGTH_SHORT).show()
            }
        })
    }

    // Validate inputs and submit the reservation to the central API
    private fun submitBooking() {
        if (nodeIds.isEmpty() || spinnerNodes.selectedItemPosition < 0) {
            Toast.makeText(this, "Please select a grid node", Toast.LENGTH_SHORT).show()
            return
        }
        val dateStr = etDate.text.toString().trim()
        val kwhStr = etEnergyKWh.text.toString().trim()

        if (dateStr.isEmpty() || kwhStr.isEmpty()) {
            Toast.makeText(this, "Please fill in all fields", Toast.LENGTH_SHORT).show()
            return
        }

        val kwh = kwhStr.toDouble()
        val selectedNodeId = nodeIds[spinnerNodes.selectedItemPosition]

        try {
            val req = JSONObject().apply {
                put("prosumerNic", session.getUserNic())
                put("nodeId", selectedNodeId)
                put("slotId", "SLOT-${System.currentTimeMillis()}")
                put("reservationDate", "${dateStr}T10:00:00Z")
                put("energyKWh", kwh)
            }

            ApiClient.request("reservation", "POST", req, session.getToken(), object : ApiClient.ApiCallback {
                override fun onSuccess(response: String) {
                    // Summary page dialog
                    AlertDialog.Builder(this@CreateReservationActivity)
                        .setTitle("Booking Submitted Successfully")
                        .setMessage(
                            "Summary:\n• Station: ${spinnerNodes.selectedItem}" +
                                    "\n• Date: $dateStr" +
                                    "\n• Energy: $kwh kWh\n• Status: Pending Approval\n\nOnce approved, your QR code will be generated."
                        )
                        .setPositiveButton("OK") { _, _ -> finish() }
                        .setCancelable(false)
                        .show()
                }

                override fun onError(error: String) {
                    Toast.makeText(this@CreateReservationActivity, error, Toast.LENGTH_LONG).show()
                }
            })
        } catch (e: Exception) {
            Toast.makeText(this, "Error submitting booking", Toast.LENGTH_SHORT).show()
        }
    }
}
