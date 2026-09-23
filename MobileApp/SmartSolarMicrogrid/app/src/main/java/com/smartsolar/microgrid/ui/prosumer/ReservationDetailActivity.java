package com.smartsolar.microgrid.ui.prosumer;

import android.graphics.Bitmap;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import com.google.zxing.BarcodeFormat;
import com.journeyapps.barcodescanner.BarcodeEncoder;
import com.smartsolar.microgrid.R;
import com.smartsolar.microgrid.api.ApiClient;
import com.smartsolar.microgrid.data.SessionManager;
import org.json.JSONObject;

public class ReservationDetailActivity extends AppCompatActivity {

    private String resId;
    private SessionManager session;
    private ImageView ivQrCode;
    private TextView tvQrNotice, tvDetailInfo;
    private Button btnCancel;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        session = new SessionManager(this);
        setContentView(R.layout.activity_reservation_detail);

        resId = getIntent().getStringExtra("resId");

        ivQrCode = findViewById(R.id.ivQrCode);
        tvQrNotice = findViewById(R.id.tvQrNotice);
        tvDetailInfo = findViewById(R.id.tvDetailInfo);
        btnCancel = findViewById(R.id.btnCancelReservation);

        btnCancel.setOnClickListener(v -> cancelBooking());

        loadDetail();
    }

    private void loadDetail() {
        ApiClient.request("reservation/" + resId, "GET", null, session.getToken(), new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(String response) {
                try {
                    JSONObject obj = new JSONObject(response);
                    String status = obj.getString("status");
                    String date = obj.getString("reservationDate");
                    double energy = obj.getDouble("energyKWh");
                    String qr = obj.optString("qrCodeData", "");

                    String info = "• ID: " + resId
                            + "\n• Status: " + status
                            + "\n• Scheduled Date: " + (date.length() >= 10 ? date.substring(0, 10) : date)
                            + "\n• Energy: " + energy + " kWh";
                    tvDetailInfo.setText(info);

                    if ("Approved".equalsIgnoreCase(status) && !qr.isEmpty()) {
                        generateQrImage(qr);
                        tvQrNotice.setText("Present this QR code to Grid Operator at node hub.");
                    } else {
                        ivQrCode.setVisibility(View.GONE);
                        tvQrNotice.setText("Status: " + status + " (QR code only available when Approved)");
                    }

                    if ("Completed".equalsIgnoreCase(status) || "Cancelled".equalsIgnoreCase(status)) {
                        btnCancel.setVisibility(View.GONE);
                    }
                } catch (Exception ignored) {}
            }
            @Override
            public void onError(String error) {
                Toast.makeText(ReservationDetailActivity.this, error, Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void generateQrImage(String data) {
        try {
            BarcodeEncoder barcodeEncoder = new BarcodeEncoder();
            Bitmap bitmap = barcodeEncoder.encodeBitmap(data, BarcodeFormat.QR_CODE, 400, 400);
            ivQrCode.setImageBitmap(bitmap);
            ivQrCode.setVisibility(View.VISIBLE);
        } catch (Exception ignored) {}
    }

    private void cancelBooking() {
        new AlertDialog.Builder(this)
                .setTitle("Cancel Booking")
                .setMessage("Are you sure you want to cancel? (Notice: Must be at least 12 hours before slot).")
                .setPositiveButton("Confirm Cancellation", (d, w) -> {
                    ApiClient.request("reservation/" + resId + "/cancel", "PUT", null, session.getToken(), new ApiClient.ApiCallback() {
                        @Override
                        public void onSuccess(String response) {
                            new AlertDialog.Builder(ReservationDetailActivity.this)
                                    .setTitle("Booking Cancelled")
                                    .setMessage("Your booking has been cancelled successfully.")
                                    .setPositiveButton("OK", (dialog, which) -> finish())
                                    .show();
                        }
                        @Override
                        public void onError(String error) {
                            Toast.makeText(ReservationDetailActivity.this, error, Toast.LENGTH_LONG).show();
                        }
                    });
                })
                .setNegativeButton("No", null)
                .show();
    }
}
