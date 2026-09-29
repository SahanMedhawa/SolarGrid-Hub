package com.smartsolar.microgrid.ui.prosumer

import android.app.DatePickerDialog
import android.app.TimePickerDialog
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.graphics.Bitmap
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.ImageView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.google.zxing.BarcodeFormat
import com.journeyapps.barcodescanner.BarcodeEncoder
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

        // Format Date
        val displayDate = if (currentDateStr.length >= 10) currentDateStr.substring(0, 10) else currentDateStr
        val displayTimeWindow = if (currentStartTime.isNotEmpty() && currentEndTime.isNotEmpty()) {
            "$currentStartTime - $currentEndTime"
        } else {
            "Standard Window"
        }

        val displaySlots = if (currentAllocatedSlots.isNotEmpty()) {
            "${currentAllocatedSlots.joinToString(", ")} (${currentAllocatedSlots.size} slot${if (currentAllocatedSlots.size > 1) "s" else ""})"
        } else if (currentSlotId.isNotEmpty()) {
            currentSlotId
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
            .append("• Booking ID: ").append(resId).append("\n")
            .append("• Prosumer NIC: ").append(prosumerNic).append("\n")
            .append("• Grid Hub Station: ").append(currentNodeId).append("\n")
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
        cardAvailabilityStatus?.visibility = View.GONE

        val etDate = dialogView.findViewById<EditText>(R.id.etDate)
        val etStartTime = dialogView.findViewById<EditText>(R.id.etStartTime)
        val etEndTime = dialogView.findViewById<EditText>(R.id.etEndTime)
        val etEnergyKWh = dialogView.findViewById<EditText>(R.id.etEnergyKWh)
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

        val dialog = AlertDialog.Builder(this)
            .setTitle("Modify Booking #$resId")
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
            }, h, m, true).show()
        }

        etEndTime.setOnClickListener {
            Toast.makeText(this, "Every energy reservation is exactly 1 hour. Tap Start Time to select.", Toast.LENGTH_SHORT).show()
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

            try {
                val updateBody = JSONObject().apply {
                    put("reservationDate", "${newDateStr}T00:00:00Z")
                    put("startTime", newStartStr)
                    put("endTime", newEndStr)
                    put("energyKWh", newKwh)
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
