package com.smartsolar.microgrid.ui.auth;

import android.os.Bundle;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.smartsolar.microgrid.R;
import com.smartsolar.microgrid.api.ApiClient;
import org.json.JSONObject;

public class RegisterActivity extends AppCompatActivity {

    private EditText etNic, etFirstName, etLastName, etEmail, etPhone, etAddress, etRegPassword;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_register);

        etNic = findViewById(R.id.etNic);
        etFirstName = findViewById(R.id.etFirstName);
        etLastName = findViewById(R.id.etLastName);
        etEmail = findViewById(R.id.etEmail);
        etPhone = findViewById(R.id.etPhone);
        etAddress = findViewById(R.id.etAddress);
        etRegPassword = findViewById(R.id.etRegPassword);
        Button btnSubmit = findViewById(R.id.btnSubmitRegister);

        btnSubmit.setOnClickListener(v -> submitRegistration());
    }

    private void submitRegistration() {
        String nic = etNic.getText().toString().trim();
        String firstName = etFirstName.getText().toString().trim();
        String lastName = etLastName.getText().toString().trim();
        String email = etEmail.getText().toString().trim();
        String phone = etPhone.getText().toString().trim();
        String address = etAddress.getText().toString().trim();
        String password = etRegPassword.getText().toString().trim();

        if (nic.isEmpty() || firstName.isEmpty() || lastName.isEmpty() || email.isEmpty() || phone.isEmpty() || address.isEmpty() || password.isEmpty()) {
            Toast.makeText(this, "Please fill all required fields", Toast.LENGTH_SHORT).show();
            return;
        }

        try {
            JSONObject payload = new JSONObject();
            payload.put("nic", nic);
            payload.put("firstName", firstName);
            payload.put("lastName", lastName);
            payload.put("email", email);
            payload.put("phone", phone);
            payload.put("address", address);
            payload.put("password", password);

            ApiClient.request("prosumer/register", "POST", payload, null, new ApiClient.ApiCallback() {
                @Override
                public void onSuccess(String response) {
                    Toast.makeText(RegisterActivity.this, "Registration submitted! Awaiting Backoffice activation.", Toast.LENGTH_LONG).show();
                    finish();
                }

                @Override
                public void onError(String error) {
                    Toast.makeText(RegisterActivity.this, error, Toast.LENGTH_LONG).show();
                }
            });
        } catch (Exception e) {
            Toast.makeText(this, "Request error", Toast.LENGTH_SHORT).show();
        }
    }
}
