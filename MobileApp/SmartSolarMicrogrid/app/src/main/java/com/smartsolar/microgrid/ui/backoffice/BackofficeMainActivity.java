package com.smartsolar.microgrid.ui.backoffice;

import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
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

public class BackofficeMainActivity extends AppCompatActivity {

    private SessionManager session;
    private TextView tvAdminWelcome;
    private TextView tvActiveNodesCount, tvPendingProsumersCount, tvPendingBookingsCount;
    private LinearLayout llPendingProsumersList, llDeactivatedProsumersList, llNodesList;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        session = new SessionManager(this);
        setContentView(R.layout.activity_backoffice_main);

        tvAdminWelcome = findViewById(R.id.tvAdminWelcome);
        tvActiveNodesCount = findViewById(R.id.tvActiveNodesCount);
        tvPendingProsumersCount = findViewById(R.id.tvPendingProsumersCount);
        tvPendingBookingsCount = findViewById(R.id.tvPendingBookingsCount);
        llPendingProsumersList = findViewById(R.id.llPendingProsumersList);
        llDeactivatedProsumersList = findViewById(R.id.llDeactivatedProsumersList);
        llNodesList = findViewById(R.id.llNodesList);

        tvAdminWelcome.setText("Welcome, " + session.getDisplayName());

        findViewById(R.id.btnRefreshBackoffice).setOnClickListener(v -> loadPortalData());

        findViewById(R.id.btnBackofficeLogout).setOnClickListener(v -> {
            session.logout();
            startActivity(new Intent(this, LoginActivity.class));
            finish();
        });
    }

    @Override
    protected void onResume() {
        super.onResume();
        loadPortalData();
    }

    private void loadPortalData() {
        String token = session.getToken();

        // 1. Fetch Prosumers (to find Pending and Deactivated)
        ApiClient.request("prosumer", "GET", null, token, new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(String response) {
                try {
                    JSONArray prosumers = new JSONArray(response);
                    renderProsumers(prosumers);
                } catch (Exception e) {
                    Toast.makeText(BackofficeMainActivity.this, "Error parsing prosumers", Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onError(String error) {
                Toast.makeText(BackofficeMainActivity.this, "Prosumers: " + error, Toast.LENGTH_SHORT).show();
            }
        });

        // 2. Fetch Nodes
        ApiClient.request("microgridnode", "GET", null, token, new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(String response) {
                try {
                    JSONArray nodes = new JSONArray(response);
                    renderNodes(nodes);
                } catch (Exception ignored) {}
            }

            @Override
            public void onError(String error) {}
        });

        // 3. Fetch Reservations
        ApiClient.request("reservation", "GET", null, token, new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(String response) {
                try {
                    JSONArray reservations = new JSONArray(response);
                    int pendingCount = 0;
                    for (int i = 0; i < reservations.length(); i++) {
                        if ("Pending".equalsIgnoreCase(reservations.getJSONObject(i).optString("status"))) {
                            pendingCount++;
                        }
                    }
                    tvPendingBookingsCount.setText(String.valueOf(pendingCount));
                } catch (Exception ignored) {}
            }

            @Override
            public void onError(String error) {}
        });
    }

    private void renderProsumers(JSONArray prosumers) {
        llPendingProsumersList.removeAllViews();
        llDeactivatedProsumersList.removeAllViews();

        int pendingCount = 0;
        int deactivatedCount = 0;

        for (int i = 0; i < prosumers.length(); i++) {
            try {
                JSONObject p = prosumers.getJSONObject(i);
                String nic = p.optString("nic", p.optString("nIC"));
                String name = p.optString("firstName") + " " + p.optString("lastName");
                String status = p.optString("status");
                String phone = p.optString("phone", "");

                if ("Pending".equalsIgnoreCase(status)) {
                    pendingCount++;
                    addProsumerItem(llPendingProsumersList, nic, name, status, phone, true);
                } else if ("Deactivated".equalsIgnoreCase(status)) {
                    deactivatedCount++;
                    addProsumerItem(llDeactivatedProsumersList, nic, name, status, phone, false);
                }
            } catch (Exception ignored) {}
        }

        tvPendingProsumersCount.setText(String.valueOf(pendingCount));

        if (pendingCount == 0) {
            TextView emptyTv = new TextView(this);
            emptyTv.setText("No pending prosumer registrations.");
            emptyTv.setTextColor(Color.GRAY);
            emptyTv.setPadding(10, 10, 10, 10);
            llPendingProsumersList.addView(emptyTv);
        }

        if (deactivatedCount == 0) {
            TextView emptyTv = new TextView(this);
            emptyTv.setText("No deactivated accounts.");
            emptyTv.setTextColor(Color.GRAY);
            emptyTv.setPadding(10, 10, 10, 10);
            llDeactivatedProsumersList.addView(emptyTv);
        }
    }

    private void addProsumerItem(LinearLayout container, String nic, String name, String status, String phone, boolean isActivate) {
        LinearLayout item = new LinearLayout(this);
        item.setOrientation(LinearLayout.VERTICAL);
        item.setPadding(14, 14, 14, 14);
        item.setBackgroundResource(R.drawable.card_bg);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        params.setMargins(0, 0, 0, 10);
        item.setLayoutParams(params);

        TextView tvTitle = new TextView(this);
        tvTitle.setText(name + " (" + nic + ")");
        tvTitle.setTextSize(14f);
        tvTitle.setTextColor(Color.BLACK);
        item.addView(tvTitle);

        TextView tvSub = new TextView(this);
        tvSub.setText("Status: " + status + " | Phone: " + phone);
        tvSub.setTextSize(12f);
        tvSub.setTextColor(Color.DKGRAY);
        item.addView(tvSub);

        Button btnAction = new Button(this);
        btnAction.setText(isActivate ? "✅ Approve & Activate" : "🔄 Reactivate Account");
        btnAction.setBackgroundColor(isActivate ? Color.parseColor("#198754") : Color.parseColor("#0d6efd"));
        btnAction.setTextColor(Color.WHITE);
        btnAction.setTextSize(12f);
        LinearLayout.LayoutParams btnParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, 110);
        btnParams.setMargins(0, 8, 0, 0);
        btnAction.setLayoutParams(btnParams);

        btnAction.setOnClickListener(v -> {
            String actionName = isActivate ? "Activate" : "Reactivate";
            new AlertDialog.Builder(this)
                    .setTitle(actionName + " Prosumer")
                    .setMessage("Are you sure you want to " + actionName.toLowerCase() + " prosumer " + nic + "?")
                    .setPositiveButton("Confirm", (dialog, which) -> {
                        // PUT prosumer/{nic}/activate handles both activate and reactivate
                        ApiClient.request("prosumer/" + nic + "/activate", "PUT", null, session.getToken(), new ApiClient.ApiCallback() {
                            @Override
                            public void onSuccess(String response) {
                                Toast.makeText(BackofficeMainActivity.this, "Prosumer " + nic + " " + actionName.toLowerCase() + "d successfully!", Toast.LENGTH_SHORT).show();
                                loadPortalData();
                            }

                            @Override
                            public void onError(String error) {
                                Toast.makeText(BackofficeMainActivity.this, "Failed: " + error, Toast.LENGTH_LONG).show();
                            }
                        });
                    })
                    .setNegativeButton("Cancel", null)
                    .show();
        });

        item.addView(btnAction);
        container.addView(item);
    }

    private void renderNodes(JSONArray nodes) {
        llNodesList.removeAllViews();
        int activeCount = 0;

        for (int i = 0; i < nodes.length(); i++) {
            try {
                JSONObject node = nodes.getJSONObject(i);
                boolean isActive = node.optBoolean("isActive", true);
                if (isActive) activeCount++;

                LinearLayout item = new LinearLayout(this);
                item.setOrientation(LinearLayout.VERTICAL);
                item.setPadding(14, 14, 14, 14);
                item.setBackgroundResource(R.drawable.card_bg);
                LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
                params.setMargins(0, 0, 0, 10);
                item.setLayoutParams(params);

                TextView tvNodeName = new TextView(this);
                tvNodeName.setText(node.optString("nodeName") + " (" + (isActive ? "ACTIVE" : "INACTIVE") + ")");
                tvNodeName.setTextSize(14f);
                tvNodeName.setTextColor(isActive ? Color.parseColor("#198754") : Color.RED);
                item.addView(tvNodeName);

                TextView tvNodeInfo = new TextView(this);
                tvNodeInfo.setText("Location: " + node.optString("location")
                        + " | Capacity: " + node.optDouble("capacityKWh", 0) + " kWh"
                        + "\nBattery Slots: " + node.optInt("batterySlots", 0)
                        + " | Available: " + node.optInt("availableBatterySlots", 0)
                        + "\nSchedule: " + node.optString("schedule", "06:00-18:00"));
                tvNodeInfo.setTextSize(12f);
                tvNodeInfo.setTextColor(Color.DKGRAY);
                item.addView(tvNodeInfo);

                llNodesList.addView(item);
            } catch (Exception ignored) {}
        }

        tvActiveNodesCount.setText(String.valueOf(activeCount));
    }
}
