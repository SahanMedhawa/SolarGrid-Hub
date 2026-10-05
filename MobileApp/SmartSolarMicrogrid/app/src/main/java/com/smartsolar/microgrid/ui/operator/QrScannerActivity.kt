package com.smartsolar.microgrid.ui.operator

import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import com.journeyapps.barcodescanner.BarcodeCallback
import com.journeyapps.barcodescanner.BarcodeResult
import com.journeyapps.barcodescanner.CaptureManager
import com.journeyapps.barcodescanner.DecoratedBarcodeView
import com.smartsolar.microgrid.R
import com.smartsolar.microgrid.api.ApiClient
import com.smartsolar.microgrid.data.SessionManager
import org.json.JSONObject

/**
 * QR Scanner Activity - allows Grid Operators to scan prosumer QR transaction passes,
 * verify server data records, and finalize energy transfer business logic.
 */
class QrScannerActivity : AppCompatActivity() {

    private lateinit var capture: CaptureManager
    private lateinit var barcodeScannerView: DecoratedBarcodeView
    private lateinit var session: SessionManager
    private var isProcessing = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        session = SessionManager(this)
        setContentView(R.layout.activity_qr_scanner)

        barcodeScannerView = findViewById(R.id.zxing_barcode_scanner)
        capture = CaptureManager(this, barcodeScannerView)
        capture.initializeFromIntent(intent, savedInstanceState)

        barcodeScannerView.decodeContinuous(object : BarcodeCallback {
            override fun barcodeResult(result: BarcodeResult) {
                if (result.text != null && !isProcessing) {
                    isProcessing = true
                    processQrCode(result.text)
                }
            }
        })
    }

    // Process the scanned QR code, verify against server data, and confirm energy transfer
    private fun processQrCode(qrData: String) {
        val parts = qrData.split("-")
        if (parts.size < 2) {
            showResultDialog("Invalid QR Format", "Scanned QR code does not match expected SMTS system token format.", false)
            return
        }

        val resId = parts[1]

        // 1. Verify Server Data first
        ApiClient.request("reservation/$resId", "GET", null, session.getToken(), object : ApiClient.ApiCallback {
            override fun onSuccess(response: String) {
                try {
                    val detail = JSONObject(response)
                    val status = detail.optString("status", "")
                    val nic = detail.optString("prosumerNic", "")
                    val energy = detail.optDouble("energyKWh", 0.0)
                    val slot = detail.optString("slotId", "")

                    if (!status.equals("Approved", ignoreCase = true)) {
                        showResultDialog(
                            "Cannot Finalize",
                            "Reservation #$resId is currently in '$status' status.\nOnly 'Approved' reservations can complete energy transfer.",
                            false
                        )
                        return
                    }

                    // Prompt operator with verified server records
                    AlertDialog.Builder(this@QrScannerActivity)
                        .setTitle("Verified Server Records ⚡")
                        .setMessage(
                            "Prosumer: $nic\n" +
                            "Booking ID: #$resId\n" +
                            "Battery Slot: $slot\n" +
                            "Transfer Energy: $energy kWh\n\n" +
                            "Confirm finalize energy transfer and release battery storage slot?"
                        )
                        .setPositiveButton("Finalize Transfer") { _, _ ->
                            executeCompletion(resId, qrData)
                        }
                        .setNegativeButton("Cancel") { _, _ ->
                            isProcessing = false
                        }
                        .setCancelable(false)
                        .show()

                } catch (e: Exception) {
                    executeCompletion(resId, qrData)
                }
            }

            override fun onError(error: String) {
                // If detail lookup fails, attempt direct completion with token
                executeCompletion(resId, qrData)
            }
        })
    }

    // Call server PUT /api/reservation/{id}/complete to finalize energy transfer
    private fun executeCompletion(resId: String, qrData: String) {
        try {
            val body = JSONObject().apply {
                put("qrData", qrData)
            }

            ApiClient.request("reservation/$resId/complete", "PUT", body, session.getToken(), object : ApiClient.ApiCallback {
                override fun onSuccess(response: String) {
                    showResultDialog(
                        "Energy Transfer Finalized! ⚡",
                        "Successfully verified and completed energy transfer for reservation #$resId.\nStation battery slot capacity has been updated.",
                        true
                    )
                }

                override fun onError(error: String) {
                    showResultDialog("Transfer Failed", error, false)
                }
            })
        } catch (e: Exception) {
            showResultDialog("Error", "Failed to process transfer request", false)
        }
    }

    // Show a result dialog and either finish activity or reset scanner state
    private fun showResultDialog(title: String, message: String, success: Boolean) {
        AlertDialog.Builder(this)
            .setTitle(title)
            .setMessage(message)
            .setPositiveButton("OK") { _, _ ->
                if (success) finish()
                else isProcessing = false
            }
            .setCancelable(false)
            .show()
    }

    override fun onResume() {
        super.onResume()
        capture.onResume()
    }

    override fun onPause() {
        super.onPause()
        capture.onPause()
    }

    override fun onDestroy() {
        super.onDestroy()
        capture.onDestroy()
    }
}
