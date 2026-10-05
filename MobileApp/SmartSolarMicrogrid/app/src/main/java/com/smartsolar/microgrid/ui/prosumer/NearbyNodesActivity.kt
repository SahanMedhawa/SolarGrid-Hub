package com.smartsolar.microgrid.ui.prosumer

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.FragmentActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import androidx.core.content.ContextCompat
import com.google.android.material.card.MaterialCardView
import com.mapbox.geojson.Point
import com.mapbox.maps.CameraOptions
import com.mapbox.maps.EdgeInsets
import com.mapbox.maps.MapView
import com.mapbox.maps.Style
import com.mapbox.maps.plugin.annotation.annotations
import com.mapbox.maps.plugin.annotation.generated.CircleAnnotationManager
import com.mapbox.maps.plugin.annotation.generated.CircleAnnotationOptions
import com.mapbox.maps.plugin.annotation.generated.createCircleAnnotationManager
import com.smartsolar.microgrid.R
import com.smartsolar.microgrid.api.ApiClient
import com.smartsolar.microgrid.data.SessionManager
import org.json.JSONArray
import java.util.Locale

/** Shows active microgrids on Mapbox and in a detailed list. */
class NearbyNodesActivity : FragmentActivity() {

    private lateinit var mapView: MapView
    private var circleAnnotationManager: CircleAnnotationManager? = null
    private var mapIsReady = false
    private var selectedNodeId: String? = null
    private lateinit var session: SessionManager
    private lateinit var nodeAdapter: GridNodeAdapter
    private lateinit var emptyState: TextView
    private lateinit var gridCount: TextView
    private val nodes = mutableListOf<GridNode>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        session = SessionManager(this)
        setContentView(R.layout.activity_nearby_nodes)

        mapView = findViewById(R.id.mapView)
        mapView.mapboxMap.loadStyleUri(Style.MAPBOX_STREETS) {
            circleAnnotationManager = mapView.annotations.createCircleAnnotationManager()
            mapIsReady = true
            renderMapSelection()
        }

        emptyState = findViewById(R.id.tvEmptyState)
        gridCount = findViewById(R.id.tvGridCount)
        findViewById<View>(R.id.btnBack).setOnClickListener { finish() }
        findViewById<View>(R.id.btnMapOverview).setOnClickListener {
            selectedNodeId = null
            renderMapSelection()
        }
        nodeAdapter = GridNodeAdapter(
            onNodeClick = { node -> focusNode(node) },
            onBookClick = { node -> openBooking(node) }
        )
        findViewById<RecyclerView>(R.id.rvGridNodes).apply {
            layoutManager = LinearLayoutManager(this@NearbyNodesActivity)
            adapter = nodeAdapter
        }

        loadNodes()
    }

    private fun loadNodes() {
        ApiClient.request("microgridnode/active", "GET", null, session.getToken(), object : ApiClient.ApiCallback {
            override fun onSuccess(response: String) {
                try {
                    val array = JSONArray(response)
                    nodes.clear()
                    for (index in 0 until array.length()) {
                        val item = array.getJSONObject(index)
                        nodes.add(
                            GridNode(
                                id = item.optString("id"),
                                name = item.optString("nodeName", "Microgrid"),
                                location = item.optString("location", "Location unavailable"),
                                latitude = item.optDouble("latitude", 0.0),
                                longitude = item.optDouble("longitude", 0.0),
                                capacityKWh = item.optDouble("capacityKWh", 0.0),
                                totalSlots = item.optInt("batterySlots", 0),
                                availableSlots = item.optInt("availableBatterySlots", 0),
                                schedule = item.optString("schedule", "Not specified")
                            )
                        )
                    }

                    gridCount.text = "${nodes.size} ${if (nodes.size == 1) "grid" else "grids"} found"
                    emptyState.visibility = if (nodes.isEmpty()) View.VISIBLE else View.GONE
                    emptyState.text = "No active grid nodes are available right now."
                    nodeAdapter.submitList(nodes.toList())
                    renderMapSelection()
                } catch (_: Exception) {
                    showLoadError("Could not read grid node details.")
                }
            }

            override fun onError(error: String) {
                showLoadError("Could not load grid nodes. Check your connection and try again.")
                Toast.makeText(this@NearbyNodesActivity, error, Toast.LENGTH_SHORT).show()
            }
        })
    }

    private fun showLoadError(message: String) {
        gridCount.text = "Unavailable"
        emptyState.text = message
        emptyState.visibility = View.VISIBLE
        nodes.clear()
        nodeAdapter.submitList(emptyList())
        renderMapSelection()
    }

    private fun focusNode(node: GridNode) {
        if (!node.hasValidCoordinates()) {
            Toast.makeText(this, "This grid has no valid map location.", Toast.LENGTH_SHORT).show()
            return
        }
        selectedNodeId = node.id
        renderMapSelection()
    }

    private fun openBooking(node: GridNode) {
        startActivity(Intent(this, CreateReservationActivity::class.java).apply {
            putExtra("nodeId", node.id)
        })
    }

    private fun renderMapSelection() {
        if (!mapIsReady) return

        val selectedNode = nodes.firstOrNull { it.id == selectedNodeId && it.hasValidCoordinates() }
        val visibleNodes = if (selectedNode != null) listOf(selectedNode) else nodes.filter { it.hasValidCoordinates() }
        val points = visibleNodes.map { Point.fromLngLat(it.longitude, it.latitude) }
        circleAnnotationManager?.let { manager ->
            manager.deleteAll()
            points.forEach { point ->
                manager.create(
                    CircleAnnotationOptions()
                        .withPoint(point)
                        .withCircleColor("#16A34A")
                        .withCircleRadius(9.0)
                        .withCircleStrokeColor("#FFFFFF")
                        .withCircleStrokeWidth(3.0)
                        .withDraggable(false)
                )
            }
        }

        if (selectedNode != null) {
            mapView.mapboxMap.setCamera(
                CameraOptions.Builder()
                    .center(points.first())
                    .zoom(15.0)
                    .build()
            )
        } else if (points.isNotEmpty()) {
            mapView.mapboxMap.cameraForCoordinates(
                points,
                CameraOptions.Builder().build(),
                EdgeInsets(36.0, 36.0, 36.0, 36.0),
                15.0,
                null
            ) { fittedCamera ->
                mapView.mapboxMap.setCamera(fittedCamera)
            }
        } else {
            mapView.mapboxMap.setCamera(
                CameraOptions.Builder()
                    .center(Point.fromLngLat(DEFAULT_LONGITUDE, DEFAULT_LATITUDE))
                    .zoom(12.0)
                    .build()
            )
        }
    }

    override fun onStart() {
        super.onStart()
        if (::mapView.isInitialized) mapView.onStart()
    }

    override fun onResume() {
        super.onResume()
        if (::mapView.isInitialized) mapView.onResume()
    }

    override fun onPause() {
        super.onPause()
    }

    override fun onStop() {
        if (::mapView.isInitialized) mapView.onStop()
        super.onStop()
    }

    override fun onLowMemory() {
        super.onLowMemory()
        if (::mapView.isInitialized) mapView.onLowMemory()
    }

    override fun onDestroy() {
        if (::mapView.isInitialized) mapView.onDestroy()
        super.onDestroy()
    }

    private fun GridNode.hasValidCoordinates(): Boolean =
        latitude in -90.0..90.0 && longitude in -180.0..180.0 && (latitude != 0.0 || longitude != 0.0)

    private fun formatCapacity(capacity: Double): String = String.format(Locale.getDefault(), "%.1f", capacity)

    companion object {
        private const val DEFAULT_LATITUDE = 6.9287630357059715
        private const val DEFAULT_LONGITUDE = 79.83832121953127
    }

    private data class GridNode(
        val id: String,
        val name: String,
        val location: String,
        val latitude: Double,
        val longitude: Double,
        val capacityKWh: Double,
        val totalSlots: Int,
        val availableSlots: Int,
        val schedule: String
    )

    private inner class GridNodeAdapter(
        private val onNodeClick: (GridNode) -> Unit,
        private val onBookClick: (GridNode) -> Unit
    ) : RecyclerView.Adapter<GridNodeAdapter.NodeViewHolder>() {
        private val items = mutableListOf<GridNode>()

        fun submitList(newItems: List<GridNode>) {
            items.clear()
            items.addAll(newItems)
            notifyDataSetChanged()
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): NodeViewHolder {
            val view = LayoutInflater.from(parent.context).inflate(R.layout.item_grid_node, parent, false)
            return NodeViewHolder(view)
        }

        override fun onBindViewHolder(holder: NodeViewHolder, position: Int) {
            val node = items[position]
            holder.name.text = node.name
            holder.location.text = "Location: ${node.location}"
            holder.capacity.text = "Total capacity: ${formatCapacity(node.capacityKWh)} kWh"
            holder.schedule.text = "Operating hours: ${node.schedule}"
            val slotsAvailable = node.availableSlots > 0
            holder.status.text = if (slotsAvailable) "AVAILABLE" else "FULL"
            val statusColor = ContextCompat.getColor(
                this@NearbyNodesActivity,
                if (slotsAvailable) R.color.status_active else R.color.status_cancelled
            )
            holder.status.setTextColor(statusColor)
            (holder.itemView as? MaterialCardView)?.strokeColor = statusColor
            holder.itemView.setOnClickListener { onNodeClick(node) }
            holder.book.setOnClickListener { onBookClick(node) }
        }

        override fun getItemCount(): Int = items.size

        inner class NodeViewHolder(view: View) : RecyclerView.ViewHolder(view) {
            val name: TextView = view.findViewById(R.id.tvNodeName)
            val status: TextView = view.findViewById(R.id.tvNodeStatus)
            val location: TextView = view.findViewById(R.id.tvNodeLocation)
            val capacity: TextView = view.findViewById(R.id.tvNodeCapacity)
            val schedule: TextView = view.findViewById(R.id.tvNodeSchedule)
            val book: View = view.findViewById(R.id.btnBookNode)
        }
    }
}
