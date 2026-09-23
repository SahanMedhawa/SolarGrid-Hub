package com.smartsolar.microgrid.ui.prosumer;

import android.content.Intent;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.EditText;
import android.widget.Spinner;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.smartsolar.microgrid.R;
import com.smartsolar.microgrid.api.ApiClient;
import com.smartsolar.microgrid.data.SessionManager;
import com.smartsolar.microgrid.models.Reservation;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;

public class ReservationListActivity extends AppCompatActivity {

    private RecyclerView rvReservations;
    private EditText etSearchQuery;
    private Spinner spinnerFilterStatus;
    private SessionManager session;
    private final ArrayList<Reservation> allList = new ArrayList<>();
    private final ArrayList<Reservation> filteredList = new ArrayList<>();
    private ReservationAdapter adapter;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        session = new SessionManager(this);
        setContentView(R.layout.activity_reservation_list);

        rvReservations = findViewById(R.id.rvReservations);
        etSearchQuery = findViewById(R.id.etSearchQuery);
        spinnerFilterStatus = findViewById(R.id.spinnerFilterStatus);

        rvReservations.setLayoutManager(new LinearLayoutManager(this));
        adapter = new ReservationAdapter();
        rvReservations.setAdapter(adapter);

        String[] statuses = {"All", "Pending", "Approved", "Completed", "Cancelled"};
        ArrayAdapter<String> statusAdapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, statuses);
        spinnerFilterStatus.setAdapter(statusAdapter);

        spinnerFilterStatus.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override
            public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
                applyFilter();
            }
            @Override
            public void onNothingSelected(AdapterView<?> parent) {}
        });

        etSearchQuery.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) { applyFilter(); }
            @Override
            public void afterTextChanged(Editable s) {}
        });
    }

    @Override
    protected void onResume() {
        super.onResume();
        loadReservations();
    }

    private void loadReservations() {
        ApiClient.request("reservation/prosumer/" + session.getUserNic(), "GET", null, session.getToken(), new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(String response) {
                try {
                    JSONArray arr = new JSONArray(response);
                    allList.clear();
                    for (int i = 0; i < arr.length(); i++) {
                        JSONObject obj = arr.getJSONObject(i);
                        Reservation r = new Reservation();
                        r.setId(obj.getString("id"));
                        r.setProsumerNic(obj.getString("prosumerNic"));
                        r.setNodeId(obj.getString("nodeId"));
                        r.setReservationDate(obj.getString("reservationDate"));
                        r.setEnergyKWh(obj.getDouble("energyKWh"));
                        r.setStatus(obj.getString("status"));
                        r.setQrCodeData(obj.optString("qrCodeData", ""));
                        allList.add(r);
                    }
                    applyFilter();
                } catch (Exception ignored) {}
            }
            @Override
            public void onError(String error) {}
        });
    }

    private void applyFilter() {
        String query = etSearchQuery.getText().toString().toLowerCase().trim();
        String selectedStatus = spinnerFilterStatus.getSelectedItem() != null ? spinnerFilterStatus.getSelectedItem().toString() : "All";

        filteredList.clear();
        for (Reservation r : allList) {
            boolean matchesStatus = "All".equalsIgnoreCase(selectedStatus) || r.getStatus().equalsIgnoreCase(selectedStatus);
            boolean matchesQuery = query.isEmpty() || r.getId().toLowerCase().contains(query) || r.getStatus().toLowerCase().contains(query);

            if (matchesStatus && matchesQuery) {
                filteredList.add(r);
            }
        }
        adapter.notifyDataSetChanged();
    }

    class ReservationAdapter extends RecyclerView.Adapter<ReservationAdapter.ViewHolder> {
        @NonNull
        @Override
        public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_reservation, parent, false);
            return new ViewHolder(v);
        }

        @Override
        public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
            Reservation r = filteredList.get(position);
            holder.tvResId.setText("Booking #" + (r.getId().length() > 8 ? r.getId().substring(0, 8) : r.getId()));
            holder.tvResStatus.setText(r.getStatus());
            holder.tvResDate.setText("Date: " + (r.getReservationDate().length() >= 10 ? r.getReservationDate().substring(0, 10) : r.getReservationDate()));
            holder.tvResKWh.setText("Energy: " + r.getEnergyKWh() + " kWh");

            holder.itemView.setOnClickListener(v -> {
                Intent intent = new Intent(ReservationListActivity.this, ReservationDetailActivity.class);
                intent.putExtra("resId", r.getId());
                startActivity(intent);
            });
        }

        @Override
        public int getItemCount() { return filteredList.size(); }

        class ViewHolder extends RecyclerView.ViewHolder {
            TextView tvResId, tvResStatus, tvResDate, tvResKWh;
            ViewHolder(View itemView) {
                super(itemView);
                tvResId = itemView.findViewById(R.id.tvResId);
                tvResStatus = itemView.findViewById(R.id.tvResStatus);
                tvResDate = itemView.findViewById(R.id.tvResDate);
                tvResKWh = itemView.findViewById(R.id.tvResKWh);
            }
        }
    }
}
