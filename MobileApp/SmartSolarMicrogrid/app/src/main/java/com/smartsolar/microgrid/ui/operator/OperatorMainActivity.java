package com.smartsolar.microgrid.ui.operator;

import android.content.Intent;
import android.os.Bundle;
import android.widget.Button;
import androidx.appcompat.app.AppCompatActivity;
import com.smartsolar.microgrid.R;
import com.smartsolar.microgrid.data.SessionManager;
import com.smartsolar.microgrid.ui.auth.LoginActivity;

public class OperatorMainActivity extends AppCompatActivity {

    private SessionManager session;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        session = new SessionManager(this);
        setContentView(R.layout.activity_operator_main);

        findViewById(R.id.btnScanQr).setOnClickListener(v -> 
                startActivity(new Intent(this, QrScannerActivity.class)));

        findViewById(R.id.btnOperatorLogout).setOnClickListener(v -> {
            session.logout();
            startActivity(new Intent(this, LoginActivity.class));
            finish();
        });
    }
}
