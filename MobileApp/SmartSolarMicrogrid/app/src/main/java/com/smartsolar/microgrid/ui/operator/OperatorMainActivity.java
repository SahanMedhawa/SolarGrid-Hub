package com.smartsolar.microgrid.ui.operator;

import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import com.smartsolar.microgrid.R;
import com.smartsolar.microgrid.api.ApiClient;
import com.smartsolar.microgrid.data.SessionManager;
import com.smartsolar.microgrid.ui.auth.LoginActivity;
import org.json.JSONArray;
import org.json.JSONObject;

public class OperatorMainActivity extends AppCompatActivity {

    private SessionManager session;
    private TextView tvOperatorWelcome;
    private EditText etManualQrToken;
    private LinearLayout llOperatorBookingsList;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        session = new SessionManager(this);
        setContentView(R.layout.activity_operator_main);

        tvOperatorWelcome = findViewById(R.id.tvOperatorWelcome);
        etManualQrToken = findViewById(R.id.etManualQrToken);
        llOperatorBookingsList = findViewById(R.id.llOperatorBookingsList);

        tvOperatorWelcome.setText("Welcome, " + session.getDisplayName());

        findViewById(R.id.btnScanQr).setOnClickListener(v -> 
                startActivity(new Intent(this, QrScannerActivity.class)));

        findViewById(R.id.btnManualVerify).setOnClickListener(v -> handleManualVerification());

        findViewById(R.id.btnRefreshOperator).setOnClickListener(v -> loadBookings());

        findViewById(R.id.btnOperatorLogout).setOnClickListener(v -> {
            session.logout();
            startActivity(new Intent(this, LoginActivity.class));
            finish();
        });
    }

    @Override
    protected void onResume() {
        super.onResume();
        loadBookings();
    }

    private void handleManualVerification() {
        String tokenInput = etManualQrToken.getText().toString().trim();
        if (tokenInput.isEmpty()) {
            Toast.makeText(this, "Please enter or paste QR token", Toast.LENGTH_SHORT).show();
            return;
        }

        // Format is typically SMTS-{resId}-{nic}-{guid}
        String[] parts = tokenInput.split("-");
        if (parts.length < 2) {
            Toast.makeText(this, "Invalid QR token format (expected SMTS-{id}-...)", Toast.LENGTH_SHORT).show();
            return;
        }

        String resId = parts[1];

        try {
            JSONObject body = new JSONObject();
            body.put("qrData", tokenInput);

            ApiClient.request("reservation/" + resId + "/complete", "PUT", body, session.getToken(), new ApiClient.ApiCallback() {
                @Override
                public void onSuccess(String response) {
                    new AlertDialog.Builder(OperatorMainActivity.this)
                            .setTitle("Energy Transfer Completed! ⚡")
                            .setMessage("Successfully verified QR token and finalized energy transfer for reservation #" + resId)
                            .setPositiveButton("OK", (d, w) -> {
                                etManualQrToken.setText("");
                                loadBookings();
                            })
                            .show();
                }

                @Override
                public void onError(String error) {
                    new AlertDialog.Builder(OperatorMainActivity.this)
                            .setTitle("Verification Failed")
                            .setMessage(error)
                            .setPositiveButton("Dismiss", null)
                            .show();
                }
            });
        } catch (Exception e) {
            Toast.makeText(this, "Verification error: " + e.getMessage(), Toast.LENGTH_SHORT).show();
        }
    }

    private void loadBookings() {
        llOperatorBookingsList.removeAllViews();

        ApiClient.request("reservation", "GET", null, session.getToken(), new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(String response) {
                try {
                    JSONArray list = new JSONArray(response);
                    renderBookings(list);
                } catch (Exception e) {
                    Toast.makeText(OperatorMainActivity.this, "Error parsing bookings", Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onError(String error) {
                Toast.makeText(OperatorMainActivity.this, "Bookings: " + error, Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void renderBookings(JSONArray list) {
        llOperatorBookingsList.removeAllViews();

        if (list.length() == 0) {
            TextView empty = new TextView(this);
            empty.setText("No active bookings found.");
            empty.setTextColor(Color.GRAY);
            empty.setPadding(10, 10, 10, 10);
            llOperatorBookingsList.addView(empty);
            return;
        }

        for (int i = 0; i < list.length(); i++) {
            try {
                JSONObject r = list.getJSONObject(i);
                String id = r.optString("id");
                String nic = r.optString("prosumerNic");
                String status = r.optString("status");
                double energy = r.optDouble("energyKWh", 0);
                String date = r.optString("reservationDate", "");
                String qrToken = r.optString("qrCodeData", "");

                LinearLayout item = new LinearLayout(this);
                item.setOrientation(LinearLayout.VERTICAL);
                item.setPadding(14, 14, 14, 14);
                item.setBackgroundResource(R.drawable.card_bg);
                LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
                params.setMargins(0, 0, 0, 10);
                item.setLayoutParams(params);

                TextView tvHead = new TextView(this);
                tvHead.setText("Booking #" + id + " | " + status);
                tvHead.setTextSize(14f);
                tvHead.setTextColor("Approved".equalsIgnoreCase(status) ? Color.parseColor("#0d6efd") :
                        "Completed".equalsIgnoreCase(status) ? Color.parseColor("#198754") :
                        "Pending".equalsIgnoreCase(status) ? Color.parseColor("#d97706") : Color.GRAY);
                item.addView(tvHead);

                TextView tvDetails = new TextView(this);
                tvDetails.setText("Prosumer: " + nic + " | Energy: " + energy + " kWh\nDate: " + (date.length() >= 10 ? date.substring(0, 10) : date));
                tvDetails.setTextSize(12f);
                tvDetails.setTextColor(Color.DKGRAY);
                item.addView(tvDetails);

                if ("Pending".equalsIgnoreCase(status)) {
                    Button btnApprove = new Button(this);
                    btnApprove.setText("✅ Approve & Generate QR");
                    btnApprove.setBackgroundColor(Color.parseColor("#198754"));
                    btnApprove.setTextColor(Color.WHITE);
                    btnApprove.setTextSize(12f);
                    LinearLayout.LayoutParams btnParams = new LinearLayout.LayoutParams(
                            LinearLayout.LayoutParams.MATCH_PARENT, 100);
                    btnParams.setMargins(0, 8, 0, 0);
                    btnApprove.setLayoutParams(btnParams);

                    btnApprove.setOnClickListener(v -> {
                        ApiClient.request("reservation/" + id + "/approve", "PUT", null, session.getToken(), new ApiClient.ApiCallback() {
                            @Override
                            public void onSuccess(String resp) {
                                Toast.makeText(OperatorMainActivity.this, "Booking approved! QR code generated.", Toast.LENGTH_SHORT).show();
                                loadBookings();
                            }

                            @Override
                            public void onError(String err) {
                                Toast.makeText(OperatorMainActivity.this, "Approval failed: " + err, Toast.LENGTH_LONG).show();
                            }
                        });
                    });
                    item.addView(btnApprove);
                } else if ("Approved".equalsIgnoreCase(status) && !qrToken.isEmpty()) {
                    Button btnFill = new Button(this);
                    btnFill.setText("⚡ Use Token to Complete Transfer");
                    btnFill.setBackgroundColor(Color.parseColor("#0d6efd"));
                    btnFill.setTextColor(Color.WHITE);
                    btnFill.setTextSize(12f);
                    LinearLayout.LayoutParams btnParams = new LinearLayout.LayoutParams(
                            LinearLayout.LayoutParams.MATCH_PARENT, 100);
                    btnParams.setMargins(0, 8, 0, 0);
                    btnFill.setLayoutParams(btnParams);

                    btnFill.setOnClickListener(v -> {
                        etManualQrToken.setText(qrToken);
                        handleManualVerification();
                    });
                    item.addView(btnFill);
                }

                llOperatorBookingsList.addView(item);
            } catch (Exception ignored) {}
        }
    }
}
