package com.smartsolar.microgrid.ui.prosumer;

import android.os.Bundle;
import android.widget.Toast;
import androidx.fragment.app.FragmentActivity;
import com.google.android.gms.maps.CameraUpdateFactory;
import com.google.android.gms.maps.GoogleMap;
import com.google.android.gms.maps.OnMapReadyCallback;
import com.google.android.gms.maps.SupportMapFragment;
import com.google.android.gms.maps.model.BitmapDescriptorFactory;
import com.google.android.gms.maps.model.LatLng;
import com.google.android.gms.maps.model.MarkerOptions;
import com.smartsolar.microgrid.R;
import com.smartsolar.microgrid.api.ApiClient;
import com.smartsolar.microgrid.data.SessionManager;
import org.json.JSONArray;
import org.json.JSONObject;

public class NearbyNodesActivity extends FragmentActivity implements OnMapReadyCallback {

    private GoogleMap mMap;
    private SessionManager session;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        session = new SessionManager(this);
        setContentView(R.layout.activity_nearby_nodes);

        SupportMapFragment mapFragment = (SupportMapFragment) getSupportFragmentManager()
                .findFragmentById(R.id.map);
        if (mapFragment != null) {
            mapFragment.getMapAsync(this);
        }
    }

    @Override
    public void onMapReady(GoogleMap googleMap) {
        mMap = googleMap;
        mMap.getUiSettings().setZoomControlsEnabled(true);
        loadNodeMarkers();
    }

    private void loadNodeMarkers() {
        ApiClient.request("microgridnode/active", "GET", null, session.getToken(), new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(String response) {
                try {
                    JSONArray arr = new JSONArray(response);
                    LatLng firstNode = null;
                    for (int i = 0; i < arr.length(); i++) {
                        JSONObject node = arr.getJSONObject(i);
                        double lat = node.getDouble("latitude");
                        double lng = node.getDouble("longitude");
                        String name = node.getString("nodeName");
                        String details = "Capacity: " + node.getDouble("capacityKWh") + " kWh | Slots: " + node.getInt("availableBatterySlots");

                        LatLng pos = new LatLng(lat, lng);
                        if (firstNode == null) firstNode = pos;

                        mMap.addMarker(new MarkerOptions()
                                .position(pos)
                                .title(name)
                                .snippet(details)
                                .icon(BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_GREEN)));
                    }

                    if (firstNode != null) {
                        mMap.animateCamera(CameraUpdateFactory.newLatLngZoom(firstNode, 12));
                    }
                } catch (Exception ignored) {}
            }
            @Override
            public void onError(String error) {
                Toast.makeText(NearbyNodesActivity.this, "Failed to load node locations", Toast.LENGTH_SHORT).show();
            }
        });
    }
}
