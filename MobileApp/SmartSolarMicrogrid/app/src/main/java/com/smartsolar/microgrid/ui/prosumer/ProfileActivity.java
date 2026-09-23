package com.smartsolar.microgrid.ui.prosumer;

import android.content.Intent;
import android.os.Bundle;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import com.smartsolar.microgrid.R;
import com.smartsolar.microgrid.api.ApiClient;
import com.smartsolar.microgrid.data.SessionManager;
import com.smartsolar.microgrid.ui.auth.LoginActivity;
import org.json.JSONObject;

public class ProfileActivity extends AppCompatActivity {

    private SessionManager session;
    private TextView tvProfileNic, tvProfileStatus;
    private EditText etProfFirstName, etProfLastName, etProfEmail, etProfPhone, etProfAddress;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        session = new SessionManager(this);
        setContentView(R.layout.activity_profile);

        tvProfileNic = findViewById(R.id.tvProfileNic);
        tvProfileStatus = findViewById(R.id.tvProfileStatus);
        etProfFirstName = findViewById(R.id.etProfFirstName);
        etProfLastName = findViewById(R.id.etProfLastName);
        etProfEmail = findViewById(R.id.etProfEmail);
        etProfPhone = findViewById(R.id.etProfPhone);
        etProfAddress = findViewById(R.id.etProfAddress);

        findViewById(R.id.btnUpdateProfile).setOnClickListener(v -> updateProfile());
        findViewById(R.id.btnDeactivateAccount).setOnClickListener(v -> confirmDeactivation());

        loadProfile();
    }

    private void loadProfile() {
        String nic = session.getUserNic();
        tvProfileNic.setText("NIC: " + nic);

        ApiClient.request("prosumer/" + nic, "GET", null, session.getToken(), new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(String response) {
                try {
                    JSONObject obj = new JSONObject(response);
                    etProfFirstName.setText(obj.optString("firstName", ""));
                    etProfLastName.setText(obj.optString("lastName", ""));
                    etProfEmail.setText(obj.optString("email", ""));
                    etProfPhone.setText(obj.optString("phone", ""));
                    etProfAddress.setText(obj.optString("address", ""));
                    tvProfileStatus.setText("Status: " + obj.optString("status", "Active"));
                } catch (Exception ignored) {}
            }
            @Override
            public void onError(String error) {
                Toast.makeText(ProfileActivity.this, error, Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void updateProfile() {
        try {
            JSONObject body = new JSONObject();
            body.put("firstName", etProfFirstName.getText().toString().trim());
            body.put("lastName", etProfLastName.getText().toString().trim());
            body.put("email", etProfEmail.getText().toString().trim());
            body.put("phone", etProfPhone.getText().toString().trim());
            body.put("address", etProfAddress.getText().toString().trim());

            ApiClient.request("prosumer/" + session.getUserNic(), "PUT", body, session.getToken(), new ApiClient.ApiCallback() {
                @Override
                public void onSuccess(String response) {
                    Toast.makeText(ProfileActivity.this, "Profile updated successfully!", Toast.LENGTH_SHORT).show();
                }
                @Override
                public void onError(String error) {
                    Toast.makeText(ProfileActivity.this, error, Toast.LENGTH_LONG).show();
                }
            });
        } catch (Exception e) {
            Toast.makeText(this, "Error building request", Toast.LENGTH_SHORT).show();
        }
    }

    private void confirmDeactivation() {
        new AlertDialog.Builder(this)
                .setTitle("Deactivate Account")
                .setMessage("Are you sure you want to request deactivation? Reactivation requires a Backoffice officer.")
                .setPositiveButton("Yes, Deactivate", (dialog, which) -> {
                    ApiClient.request("prosumer/" + session.getUserNic() + "/deactivate", "PUT", null, session.getToken(), new ApiClient.ApiCallback() {
                        @Override
                        public void onSuccess(String response) {
                            Toast.makeText(ProfileActivity.this, "Account deactivated. Logging out...", Toast.LENGTH_LONG).show();
                            session.logout();
                            startActivity(new Intent(ProfileActivity.this, LoginActivity.class));
                            finishAffinity();
                        }
                        @Override
                        public void onError(String error) {
                            Toast.makeText(ProfileActivity.this, error, Toast.LENGTH_LONG).show();
                        }
                    });
                })
                .setNegativeButton("Cancel", null)
                .show();
    }
}
