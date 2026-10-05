package com.smartsolar.microgrid.ui.prosumer

import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.Spinner
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.smartsolar.microgrid.R
import com.smartsolar.microgrid.api.ApiClient
import com.smartsolar.microgrid.data.SessionManager
import com.smartsolar.microgrid.models.Reservation
import org.json.JSONArray

/**
 * Reservation List Activity - displays the prosumer's booking history
 * with real-time search, status filtering, and offline SQLite cache support.
 */
class ReservationListActivity : AppCompatActivity() {

    private lateinit var rvReservations: RecyclerView
    private lateinit var etSearchQuery: EditText
    private lateinit var spinnerFilterStatus: Spinner
    private lateinit var tvEmptyState: TextView
    private lateinit var session: SessionManager
    private val allList = ArrayList<Reservation>()
    private val filteredList = ArrayList<Reservation>()
    private lateinit var adapter: ReservationAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        session = SessionManager(this)
        setContentView(R.layout.activity_reservation_list)

        rvReservations = findViewById(R.id.rvReservations)
        etSearchQuery = findViewById(R.id.etSearchQuery)
        spinnerFilterStatus = findViewById(R.id.spinnerFilterStatus)
        tvEmptyState = findViewById(R.id.tvEmptyState)
        val btnNewBooking = findViewById<Button>(R.id.btnNewBooking)

        btnNewBooking.setOnClickListener {
            startActivity(Intent(this, CreateReservationActivity::class.java))
        }

        rvReservations.layoutManager = LinearLayoutManager(this)
        adapter = ReservationAdapter()
        rvReservations.adapter = adapter

        val statuses = arrayOf("All Statuses", "Pending", "Approved", "Completed", "Cancelled")
        val statusAdapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, statuses)
        spinnerFilterStatus.adapter = statusAdapter

        spinnerFilterStatus.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                applyFilter()
            }
            override fun onNothingSelected(parent: AdapterView<*>?) {}
        }

        etSearchQuery.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) { applyFilter() }
            override fun afterTextChanged(s: Editable?) {}
        })
    }

    override fun onResume() {
        super.onResume()
        loadReservations()
    }

    // Load reservations from API, falling back to local SQLite cache if offline
    private fun loadReservations() {
        val nic = session.getUserNic()
        ApiClient.request("reservation/prosumer/$nic", "GET", null, session.getToken(), object : ApiClient.ApiCallback {
            override fun onSuccess(response: String) {
                try {
                    val arr = JSONArray(response)
                    allList.clear()
                    for (i in 0 until arr.length()) {
                        val obj = arr.getJSONObject(i)
                        val slotsArr = obj.optJSONArray("allocatedSlotIds")
                        val allocatedSlots = ArrayList<String>()
                        if (slotsArr != null) {
                            for (j in 0 until slotsArr.length()) {
                                allocatedSlots.add(slotsArr.getString(j))
                            }
                        }
                        val slotNamesArr = obj.optJSONArray("allocatedSlotNames")
                        val allocatedSlotNamesList = ArrayList<String>()
                        if (slotNamesArr != null) {
                            for (j in 0 until slotNamesArr.length()) {
                                allocatedSlotNamesList.add(slotNamesArr.getString(j))
                            }
                        }
                        val r = Reservation(
                            id = obj.getString("id"),
                            prosumerNic = obj.optString("prosumerNic", nic),
                            slotId = obj.optString("slotId", ""),
                            nodeId = obj.optString("nodeId", ""),
                            reservationDate = obj.optString("reservationDate", ""),
                            startTime = obj.optString("startTime", ""),
                            endTime = obj.optString("endTime", ""),
                            energyKWh = obj.optDouble("energyKWh", 0.0),
                            status = obj.optString("status", "Pending"),
                            qrCodeData = obj.optString("qrCodeData", ""),
                            allocatedSlotIds = allocatedSlots,
                            allocatedSlotNames = allocatedSlotNamesList
                        )
                        allList.add(r)
                    }

                    // Cache in local SQLite
                    session.dbHelper.cacheReservations(allList)
                    applyFilter()
                } catch (_: Exception) {
                    loadFromLocalDatabase()
                }
            }

            override fun onError(error: String) {
                loadFromLocalDatabase()
            }
        })
    }

    // Load cached reservations from local SQLite
    private fun loadFromLocalDatabase() {
        allList.clear()
        allList.addAll(session.dbHelper.getCachedReservations(session.getUserNic()))
        applyFilter()
    }

    // Apply search query and status filter
    private fun applyFilter() {
        val query = etSearchQuery.text.toString().lowercase().trim()
        val selectedStatus = spinnerFilterStatus.selectedItem?.toString() ?: "All Statuses"

        filteredList.clear()
        for (r in allList) {
            val matchesStatus = selectedStatus == "All Statuses" ||
                    r.status.equals(selectedStatus, ignoreCase = true)
            val matchesQuery = query.isEmpty() ||
                    r.id.lowercase().contains(query) ||
                    r.slotId.lowercase().contains(query) ||
                    r.status.lowercase().contains(query)

            if (matchesStatus && matchesQuery) {
                filteredList.add(r)
            }
        }

        if (filteredList.isEmpty()) {
            tvEmptyState.visibility = View.VISIBLE
            rvReservations.visibility = View.GONE
        } else {
            tvEmptyState.visibility = View.GONE
            rvReservations.visibility = View.VISIBLE
        }
        adapter.notifyDataSetChanged()
    }

    // RecyclerView Adapter for reservations
    inner class ReservationAdapter : RecyclerView.Adapter<ReservationAdapter.ViewHolder>() {

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
            val v = LayoutInflater.from(parent.context).inflate(R.layout.item_reservation, parent, false)
            return ViewHolder(v)
        }

        override fun onBindViewHolder(holder: ViewHolder, position: Int) {
            val r = filteredList[position]
            holder.tvResId.text = "⚡ Energy Booking • ${r.energyKWh} kWh"
            holder.tvResStatus.text = r.status
            val formattedDate = if (r.reservationDate.length >= 10) r.reservationDate.substring(0, 10) else r.reservationDate
            val timeWindowStr = if (r.startTime.isNotEmpty() && r.endTime.isNotEmpty()) " (${r.startTime}-${r.endTime})" else ""
            holder.tvResDate.text = "📅 $formattedDate$timeWindowStr"
            holder.tvResSlot.text = if (r.allocatedSlotNames.isNotEmpty()) r.allocatedSlotNames.joinToString(", ") else if (r.allocatedSlotIds.isNotEmpty()) "${r.allocatedSlotIds.size} slot(s)" else "Auto-allocated"
            holder.tvResKWh.text = "Slot Details ›"

            // Status color-coding
            val statusColor = when (r.status.lowercase()) {
                "approved" -> ContextCompat.getColor(this@ReservationListActivity, R.color.status_approved)
                "pending" -> ContextCompat.getColor(this@ReservationListActivity, R.color.status_pending)
                "completed" -> ContextCompat.getColor(this@ReservationListActivity, R.color.status_completed)
                "cancelled" -> ContextCompat.getColor(this@ReservationListActivity, R.color.status_cancelled)
                else -> ContextCompat.getColor(this@ReservationListActivity, R.color.text_secondary)
            }
            holder.tvResStatus.setTextColor(statusColor)

            // QR badge visibility hint
            if (r.status.equals("Approved", ignoreCase = true)) {
                holder.tvQrBadge.visibility = View.VISIBLE
                holder.tvQrBadge.text = "View QR Pass ›"
            } else {
                holder.tvQrBadge.visibility = View.VISIBLE
                holder.tvQrBadge.text = "View Details ›"
            }

            holder.itemView.setOnClickListener {
                val intent = Intent(this@ReservationListActivity, ReservationDetailActivity::class.java)
                intent.putExtra("resId", r.id)
                startActivity(intent)
            }
        }

        override fun getItemCount(): Int = filteredList.size

        inner class ViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
            val tvResId: TextView = itemView.findViewById(R.id.tvResId)
            val tvResStatus: TextView = itemView.findViewById(R.id.tvResStatus)
            val tvResDate: TextView = itemView.findViewById(R.id.tvResDate)
            val tvResSlot: TextView = itemView.findViewById(R.id.tvResSlot)
            val tvResKWh: TextView = itemView.findViewById(R.id.tvResKWh)
            val tvQrBadge: TextView = itemView.findViewById(R.id.tvQrBadge)
        }
    }
}
