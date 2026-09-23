package com.smartsolar.microgrid.ui.prosumer;

import android.content.Intent;
import android.os.Bundle;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.smartsolar.microgrid.R;
import com.smartsolar.microgrid.api.ApiClient;
import com.smartsolar.microgrid.data.SessionManager;
import com.smartsolar.microgrid.ui.auth.LoginActivity;
import org.json.JSONArray;
import org.json.JSONObject;

public class ProsumerMainActivity extends AppCompatActivity {

    private SessionManager session;
    private TextView tvWelcome, tvApprovedCount, tvPendingCount;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        session = new SessionManager(this);
        setContentView(R.layout.activity_prosumer_main);

        tvWelcome = findViewById(R.id.tvWelcome);
        tvApprovedCount = findViewById(R.id.tvApprovedCount);
        tvPendingCount = findViewById(R.id.tvPendingCount);

        tvWelcome.setText("Welcome, " + session.getDisplayName());

        findViewById(R.id.btnBookSlot).setOnClickListener(v -> 
                startActivity(new Intent(this, CreateReservationActivity.class)));

        findViewById(R.id.btnMyBookings).setOnClickListener(v -> 
                startActivity(new Intent(this, ReservationListActivity.class)));

        findViewById(R.id.btnNearbyNodes).setOnClickListener(v -> 
                startActivity(new Intent(this, NearbyNodesActivity.class)));

        findViewById(R.id.btnProfile).setOnClickListener(v -> 
                startActivity(new Intent(this, ProfileActivity.class)));

        findViewById(R.id.btnLogout).setOnClickListener(v -> {
            session.logout();
            startActivity(new Intent(this, LoginActivity.class));
            finish();
        });
    }

    @Override
    protected void onResume() {
        super.onResume();
        loadDashboardData();
    }

    private void loadDashboardData() {
        String nic = session.getUserNic();
        String token = session.getToken();

        // 1. Fetch Approved Future Count
        ApiClient.request("reservation/prosumer/" + nic + "/future-count", "GET", null, token, new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(String response) {
                try {
                    JSONObject res = new JSONObject(response);
                    tvApprovedCount.setText(String.valueOf(res.optInt("count", 0)));
                } catch (Exception ignored) {}
            }
            @Override
            public void onError(String error) {}
        });

        // 2. Fetch Prosumer's pending reservations count
        ApiClient.request("reservation/prosumer/" + nic, "GET", null, token, new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(String response) {
                try {
                    JSONArray arr = new JSONArray(response);
                    int pending = 0;
                    for (int i = 0; i < arr.length(); i++) {
                        if ("Pending".equalsIgnoreCase(arr.getJSONObject(i).getString("status"))) {
                            pending++;
                        }
                    }
                    tvPendingCount.setText(String.valueOf(pending));
                } catch (Exception ignored) {}
            }
            @Override
            public void onError(String error) {}
        });
    }
}
