package com.smartsolar.microgrid.ui.auth;

import android.content.Intent;
import android.os.Bundle;
import android.widget.Button;
import android.widget.EditText;
import android.widget.RadioButton;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.smartsolar.microgrid.R;
import com.smartsolar.microgrid.api.ApiClient;
import com.smartsolar.microgrid.data.SessionManager;
import com.smartsolar.microgrid.ui.operator.OperatorMainActivity;
import com.smartsolar.microgrid.ui.prosumer.ProsumerMainActivity;
import org.json.JSONObject;

public class LoginActivity extends AppCompatActivity {

    private EditText etUsername, etPassword;
    private RadioButton rbProsumer;
    private SessionManager session;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        session = new SessionManager(this);

        // Check if session already exists
        if (session.isLoggedIn()) {
            navigateByRole(session.getUserRole());
            return;
        }

        setContentView(R.layout.activity_login);

        etUsername = findViewById(R.id.etUsername);
        etPassword = findViewById(R.id.etPassword);
        rbProsumer = findViewById(R.id.rbProsumer);
        Button btnLogin = findViewById(R.id.btnLogin);
        Button btnRegister = findViewById(R.id.btnRegister);

        btnLogin.setOnClickListener(v -> handleLogin());
        btnRegister.setOnClickListener(v -> startActivity(new Intent(this, RegisterActivity.class)));
    }

    private void handleLogin() {
        String username = etUsername.getText().toString().trim();
        String password = etPassword.getText().toString().trim();
        String loginType = rbProsumer.isChecked() ? "Prosumer" : "User";

        if (username.isEmpty() || password.isEmpty()) {
            Toast.makeText(this, "Please fill in all fields", Toast.LENGTH_SHORT).show();
            return;
        }

        try {
            JSONObject payload = new JSONObject();
            payload.put("username", username);
            payload.put("password", password);
            payload.put("loginType", loginType);

            ApiClient.request("auth/login", "POST", payload, null, new ApiClient.ApiCallback() {
                @Override
                public void onSuccess(String response) {
                    try {
                        JSONObject res = new JSONObject(response);
                        String token = res.getString("token");
                        String role = res.getString("role");
                        String userId = res.getString("userId");
                        String displayName = res.getString("displayName");

                        session.createLoginSession(token, userId, username, role, displayName);
                        navigateByRole(role);
                    } catch (Exception e) {
                        Toast.makeText(LoginActivity.this, "Response parsing error", Toast.LENGTH_SHORT).show();
                    }
                }

                @Override
                public void onError(String error) {
                    Toast.makeText(LoginActivity.this, error, Toast.LENGTH_LONG).show();
                }
            });
        } catch (Exception e) {
            Toast.makeText(this, "Request error", Toast.LENGTH_SHORT).show();
        }
    }

    private void navigateByRole(String role) {
        if ("Prosumer".equalsIgnoreCase(role)) {
            startActivity(new Intent(this, ProsumerMainActivity.class));
        } else {
            startActivity(new Intent(this, OperatorMainActivity.class));
        }
        finish();
    }
}
