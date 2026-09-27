package com.smartsolar.microgrid.ui.prosumer

import android.graphics.Bitmap
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.ImageView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import com.google.zxing.BarcodeFormat
import com.journeyapps.barcodescanner.BarcodeEncoder
import com.smartsolar.microgrid.R
import com.smartsolar.microgrid.api.ApiClient
import com.smartsolar.microgrid.data.SessionManager
import org.json.JSONObject

/**
 * Reservation Detail Activity - shows full booking details including
 * QR code display for approved reservations and cancellation option.
 */
class ReservationDetailActivity : AppCompatActivity() {

    private var resId: String? = null
    private lateinit var session: SessionManager
    private lateinit var ivQrCode: ImageView
    private lateinit var tvQrNotice: TextView
    private lateinit var tvDetailInfo: TextView
    private lateinit var btnCancel: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        session = SessionManager(this)
        setContentView(R.layout.activity_reservation_detail)

        resId = intent.getStringExtra("resId")

        ivQrCode = findViewById(R.id.ivQrCode)
        tvQrNotice = findViewById(R.id.tvQrNotice)
        tvDetailInfo = findViewById(R.id.tvDetailInfo)
        btnCancel = findViewById(R.id.btnCancelReservation)

        btnCancel.setOnClickListener { cancelBooking() }

        loadDetail()
    }

    // Load reservation details from the central API
    private fun loadDetail() {
        ApiClient.request("reservation/$resId", "GET", null, session.getToken(), object : ApiClient.ApiCallback {
            override fun onSuccess(response: String) {
                try {
                    val obj = JSONObject(response)
                    val status = obj.getString("status")
                    val date = obj.getString("reservationDate")
                    val energy = obj.getDouble("energyKWh")
                    val qr = obj.optString("qrCodeData", "")

                    val info = "• ID: $resId" +
                            "\n• Status: $status" +
                            "\n• Scheduled Date: ${if (date.length >= 10) date.substring(0, 10) else date}" +
                            "\n• Energy: $energy kWh"
                    tvDetailInfo.text = info

                    if ("Approved".equals(status, ignoreCase = true) && qr.isNotEmpty()) {
                        generateQrImage(qr)
                        tvQrNotice.text = "Present this QR code to Grid Operator at node hub."
                    } else {
                        ivQrCode.visibility = View.GONE
                        tvQrNotice.text = "Status: $status (QR code only available when Approved)"
                    }

                    if ("Completed".equals(status, ignoreCase = true) || "Cancelled".equals(status, ignoreCase = true)) {
                        btnCancel.visibility = View.GONE
                    }
                } catch (_: Exception) { }
            }

            override fun onError(error: String) {
                Toast.makeText(this@ReservationDetailActivity, error, Toast.LENGTH_SHORT).show()
            }
        })
    }

    // Generate a QR code bitmap from the transaction data string
    private fun generateQrImage(data: String) {
        try {
            val barcodeEncoder = BarcodeEncoder()
            val bitmap: Bitmap = barcodeEncoder.encodeBitmap(data, BarcodeFormat.QR_CODE, 400, 400)
            ivQrCode.setImageBitmap(bitmap)
            ivQrCode.visibility = View.VISIBLE
        } catch (_: Exception) { }
    }

    // Confirm and cancel the booking via the central API
    private fun cancelBooking() {
        AlertDialog.Builder(this)
            .setTitle("Cancel Booking")
            .setMessage("Are you sure you want to cancel? (Notice: Must be at least 12 hours before slot).")
            .setPositiveButton("Confirm Cancellation") { _, _ ->
                ApiClient.request("reservation/$resId/cancel", "PUT", null, session.getToken(), object : ApiClient.ApiCallback {
                    override fun onSuccess(response: String) {
                        AlertDialog.Builder(this@ReservationDetailActivity)
                            .setTitle("Booking Cancelled")
                            .setMessage("Your booking has been cancelled successfully.")
                            .setPositiveButton("OK") { _, _ -> finish() }
                            .show()
                    }

                    override fun onError(error: String) {
                        Toast.makeText(this@ReservationDetailActivity, error, Toast.LENGTH_LONG).show()
                    }
                })
            }
            .setNegativeButton("No", null)
            .show()
    }
}
