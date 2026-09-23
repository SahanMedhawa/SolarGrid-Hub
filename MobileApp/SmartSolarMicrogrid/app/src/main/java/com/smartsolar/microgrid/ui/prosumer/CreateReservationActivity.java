package com.smartsolar.microgrid.ui.prosumer;

import android.app.DatePickerDialog;
import android.os.Bundle;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Spinner;
import android.widget.Toast;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import com.smartsolar.microgrid.R;
import com.smartsolar.microgrid.api.ApiClient;
import com.smartsolar.microgrid.data.SessionManager;
import org.json.JSONArray;
import org.json.JSONObject;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Locale;

public class CreateReservationActivity extends AppCompatActivity {

    private Spinner spinnerNodes;
    private EditText etDate, etEnergyKWh;
    private SessionManager session;
    private final ArrayList<String> nodeIds = new ArrayList<>();
    private final ArrayList<String> nodeNames = new ArrayList<>();
    private final Calendar selectedCalendar = Calendar.getInstance();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        session = new SessionManager(this);
        setContentView(R.layout.activity_create_reservation);

        spinnerNodes = findViewById(R.id.spinnerNodes);
        etDate = findViewById(R.id.etDate);
        etEnergyKWh = findViewById(R.id.etEnergyKWh);
        Button btnSubmit = findViewById(R.id.btnSubmitReservation);

        etDate.setOnClickListener(v -> showDatePicker());
        btnSubmit.setOnClickListener(v -> submitBooking());

        loadActiveNodes();
    }

    private void showDatePicker() {
        Calendar maxCal = Calendar.getInstance();
        maxCal.add(Calendar.DAY_OF_YEAR, 7); // 7-day rule constraint

        DatePickerDialog datePickerDialog = new DatePickerDialog(this,
                (view, year, month, dayOfMonth) -> {
                    selectedCalendar.set(Calendar.YEAR, year);
                    selectedCalendar.set(Calendar.MONTH, month);
                    selectedCalendar.set(Calendar.DAY_OF_MONTH, dayOfMonth);
                    SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
                    etDate.setText(sdf.format(selectedCalendar.getTime()));
                },
                selectedCalendar.get(Calendar.YEAR),
                selectedCalendar.get(Calendar.MONTH),
                selectedCalendar.get(Calendar.DAY_OF_MONTH));

        datePickerDialog.getDatePicker().setMinDate(System.currentTimeMillis());
        datePickerDialog.getDatePicker().setMaxDate(maxCal.getTimeInMillis());
        datePickerDialog.show();
    }

    private void loadActiveNodes() {
        ApiClient.request("microgridnode/active", "GET", null, session.getToken(), new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(String response) {
                try {
                    JSONArray arr = new JSONArray(response);
                    nodeIds.clear();
                    nodeNames.clear();
                    for (int i = 0; i < arr.length(); i++) {
                        JSONObject node = arr.getJSONObject(i);
                        nodeIds.add(node.getString("id"));
                        nodeNames.add(node.getString("nodeName") + " (" + node.getString("location") + ")");
                    }
                    ArrayAdapter<String> adapter = new ArrayAdapter<>(CreateReservationActivity.this,
                            android.R.layout.simple_spinner_dropdown_item, nodeNames);
                    spinnerNodes.setAdapter(adapter);
                } catch (Exception ignored) {}
            }
            @Override
            public void onError(String error) {
                Toast.makeText(CreateReservationActivity.this, "Failed to load nodes: " + error, Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void submitBooking() {
        if (nodeIds.isEmpty() || spinnerNodes.getSelectedItemPosition() < 0) {
            Toast.makeText(this, "Please select a grid node", Toast.LENGTH_SHORT).show();
            return;
        }
        String dateStr = etDate.getText().toString().trim();
        String kwhStr = etEnergyKWh.getText().toString().trim();

        if (dateStr.isEmpty() || kwhStr.isEmpty()) {
            Toast.makeText(this, "Please fill in all fields", Toast.LENGTH_SHORT).show();
            return;
        }

        double kwh = Double.parseDouble(kwhStr);
        String selectedNodeId = nodeIds.get(spinnerNodes.getSelectedItemPosition());

        try {
            JSONObject req = new JSONObject();
            req.put("prosumerNic", session.getUserNic());
            req.put("nodeId", selectedNodeId);
            req.put("slotId", "SLOT-" + System.currentTimeMillis());
            req.put("reservationDate", dateStr + "T10:00:00Z");
            req.put("energyKWh", kwh);

            ApiClient.request("reservation", "POST", req, session.getToken(), new ApiClient.ApiCallback() {
                @Override
                public void onSuccess(String response) {
                    // Summary page dialog
                    new AlertDialog.Builder(CreateReservationActivity.this)
                            .setTitle("Booking Submitted Successfully")
                            .setMessage("Summary:\n• Station: " + spinnerNodes.getSelectedItem().toString()
                                    + "\n• Date: " + dateStr
                                    + "\n• Energy: " + kwh + " kWh\n• Status: Pending Approval\n\nOnce approved, your QR code will be generated.")
                            .setPositiveButton("OK", (d, w) -> finish())
                            .setCancelable(false)
                            .show();
                }
                @Override
                public void onError(String error) {
                    Toast.makeText(CreateReservationActivity.this, error, Toast.LENGTH_LONG).show();
                }
            });
        } catch (Exception e) {
            Toast.makeText(this, "Error submitting booking", Toast.LENGTH_SHORT).show();
        }
    }
}
