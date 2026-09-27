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
 * QR Scanner Activity - allows Grid Operators to scan prosumer QR codes
 * and verify/complete energy transfer transactions via the central API.
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

    // Process the scanned QR code data and call the server completion API
    private fun processQrCode(qrData: String) {
        // Expected QR format: SMTS-{reservationId}-{prosumerNic}-{guid}
        val parts = qrData.split("-")
        if (parts.size < 2) {
            showResultDialog("Invalid QR", "Scanned QR code does not match system format.", false)
            return
        }

        val resId = parts[1]
        try {
            val body = JSONObject().apply {
                put("qrData", qrData)
            }

            ApiClient.request("reservation/$resId/complete", "PUT", body, session.getToken(), object : ApiClient.ApiCallback {
                override fun onSuccess(response: String) {
                    showResultDialog(
                        "Energy Transfer Verified",
                        "Reservation $resId verified on server.\nEnergy transfer finalized and marked Completed!",
                        true
                    )
                }

                override fun onError(error: String) {
                    showResultDialog("Verification Failed", error, false)
                }
            })
        } catch (e: Exception) {
            showResultDialog("Error", "Failed to process QR data", false)
        }
    }

    // Show a result dialog and either finish or reset processing state
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
