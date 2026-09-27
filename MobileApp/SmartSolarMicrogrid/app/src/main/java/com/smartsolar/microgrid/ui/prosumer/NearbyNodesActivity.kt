package com.smartsolar.microgrid.ui.prosumer

import android.os.Bundle
import android.widget.Toast
import androidx.fragment.app.FragmentActivity
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.OnMapReadyCallback
import com.google.android.gms.maps.SupportMapFragment
import com.google.android.gms.maps.model.BitmapDescriptorFactory
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.MarkerOptions
import com.smartsolar.microgrid.R
import com.smartsolar.microgrid.api.ApiClient
import com.smartsolar.microgrid.data.SessionManager
import org.json.JSONArray

/**
 * Nearby Nodes Activity - displays active microgrid node locations
 * on a Google Maps view with capacity and battery slot details.
 */
class NearbyNodesActivity : FragmentActivity(), OnMapReadyCallback {

    private var mMap: GoogleMap? = null
    private lateinit var session: SessionManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        session = SessionManager(this)
        setContentView(R.layout.activity_nearby_nodes)

        val mapFragment = supportFragmentManager.findFragmentById(R.id.map) as? SupportMapFragment
        mapFragment?.getMapAsync(this)
    }

    // Called when the Google Map is ready; enable zoom controls and load node markers
    override fun onMapReady(googleMap: GoogleMap) {
        mMap = googleMap
        mMap?.uiSettings?.isZoomControlsEnabled = true
        loadNodeMarkers()
    }

    // Fetch active microgrid nodes from the central API and plot them as map markers
    private fun loadNodeMarkers() {
        ApiClient.request("microgridnode/active", "GET", null, session.getToken(), object : ApiClient.ApiCallback {
            override fun onSuccess(response: String) {
                try {
                    val arr = JSONArray(response)
                    var firstNode: LatLng? = null
                    for (i in 0 until arr.length()) {
                        val node = arr.getJSONObject(i)
                        val lat = node.getDouble("latitude")
                        val lng = node.getDouble("longitude")
                        val name = node.getString("nodeName")
                        val details = "Capacity: ${node.getDouble("capacityKWh")} kWh | Slots: ${node.getInt("availableBatterySlots")}"

                        val pos = LatLng(lat, lng)
                        if (firstNode == null) firstNode = pos

                        mMap?.addMarker(
                            MarkerOptions()
                                .position(pos)
                                .title(name)
                                .snippet(details)
                                .icon(BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_GREEN))
                        )
                    }

                    if (firstNode != null) {
                        mMap?.animateCamera(CameraUpdateFactory.newLatLngZoom(firstNode, 12f))
                    }
                } catch (_: Exception) { }
            }

            override fun onError(error: String) {
                Toast.makeText(this@NearbyNodesActivity, "Failed to load node locations", Toast.LENGTH_SHORT).show()
            }
        })
    }
}
