package com.smartsolar.microgrid.ui.operator;

import android.content.Intent;
import android.os.Bundle;
import android.widget.Toast;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import com.journeyapps.barcodescanner.CaptureManager;
import com.journeyapps.barcodescanner.DecoratedBarcodeView;
import com.journeyapps.barcodescanner.BarcodeCallback;
import com.journeyapps.barcodescanner.BarcodeResult;
import com.smartsolar.microgrid.R;
import com.smartsolar.microgrid.api.ApiClient;
import com.smartsolar.microgrid.data.SessionManager;
import org.json.JSONObject;

public class QrScannerActivity extends AppCompatActivity {

    private CaptureManager capture;
    private DecoratedBarcodeView barcodeScannerView;
    private SessionManager session;
    private boolean isProcessing = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        session = new SessionManager(this);
        setContentView(R.layout.activity_qr_scanner);

        barcodeScannerView = findViewById(R.id.zxing_barcode_scanner);
        capture = new CaptureManager(this, barcodeScannerView);
        capture.initializeFromIntent(getIntent(), savedInstanceState);

        barcodeScannerView.decodeContinuous(new BarcodeCallback() {
            @Override
            public void barcodeResult(BarcodeResult result) {
                if (result.getText() != null && !isProcessing) {
                    isProcessing = true;
                    processQrCode(result.getText());
                }
            }
        });
    }

    private void processQrCode(String qrData) {
        // Expected QR format: SMTS-{reservationId}-{prosumerNic}-{guid}
        String[] parts = qrData.split("-");
        if (parts.length < 2) {
            showResultDialog("Invalid QR", "Scanned QR code does not match system format.", false);
            return;
        }

        String resId = parts[1];
        try {
            JSONObject body = new JSONObject();
            body.put("qrData", qrData);

            ApiClient.request("reservation/" + resId + "/complete", "PUT", body, session.getToken(), new ApiClient.ApiCallback() {
                @Override
                public void onSuccess(String response) {
                    showResultDialog("Energy Transfer Verified",
                            "Reservation " + resId + " verified on server.\nEnergy transfer finalized and marked Completed!", true);
                }
                @Override
                public void onError(String error) {
                    showResultDialog("Verification Failed", error, false);
                }
            });
        } catch (Exception e) {
            showResultDialog("Error", "Failed to process QR data", false);
        }
    }

    private void showResultDialog(String title, String message, boolean success) {
        new AlertDialog.Builder(this)
                .setTitle(title)
                .setMessage(message)
                .setPositiveButton("OK", (d, w) -> {
                    if (success) finish();
                    else isProcessing = false;
                })
                .setCancelable(false)
                .show();
    }

    @Override
    protected void onResume() {
        super.onResume();
        capture.onResume();
    }

    @Override
    protected void onPause() {
        super.onPause();
        capture.onPause();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        capture.onDestroy();
    }
}
