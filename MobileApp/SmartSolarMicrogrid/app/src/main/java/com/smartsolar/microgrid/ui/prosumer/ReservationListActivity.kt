package com.smartsolar.microgrid.ui.prosumer

import android.content.Intent
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.EditText
import android.widget.Spinner
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.smartsolar.microgrid.R
import com.smartsolar.microgrid.api.ApiClient
import com.smartsolar.microgrid.data.SessionManager
import com.smartsolar.microgrid.models.Reservation
import org.json.JSONArray

/**
 * Reservation List Activity - displays the prosumer's booking history
 * with search and status filter functionality using RecyclerView.
 */
class ReservationListActivity : AppCompatActivity() {

    private lateinit var rvReservations: RecyclerView
    private lateinit var etSearchQuery: EditText
    private lateinit var spinnerFilterStatus: Spinner
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

        rvReservations.layoutManager = LinearLayoutManager(this)
        adapter = ReservationAdapter()
        rvReservations.adapter = adapter

        val statuses = arrayOf("All", "Pending", "Approved", "Completed", "Cancelled")
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

    // Load the prosumer's reservations from the central API
    private fun loadReservations() {
        ApiClient.request("reservation/prosumer/${session.getUserNic()}", "GET", null, session.getToken(), object : ApiClient.ApiCallback {
            override fun onSuccess(response: String) {
                try {
                    val arr = JSONArray(response)
                    allList.clear()
                    for (i in 0 until arr.length()) {
                        val obj = arr.getJSONObject(i)
                        val r = Reservation(
                            id = obj.getString("id"),
                            prosumerNic = obj.getString("prosumerNic"),
                            nodeId = obj.getString("nodeId"),
                            reservationDate = obj.getString("reservationDate"),
                            energyKWh = obj.getDouble("energyKWh"),
                            status = obj.getString("status"),
                            qrCodeData = obj.optString("qrCodeData", "")
                        )
                        allList.add(r)
                    }
                    applyFilter()
                } catch (_: Exception) { }
            }

            override fun onError(error: String) { }
        })
    }

    // Apply search query and status filter to the reservation list
    private fun applyFilter() {
        val query = etSearchQuery.text.toString().lowercase().trim()
        val selectedStatus = spinnerFilterStatus.selectedItem?.toString() ?: "All"

        filteredList.clear()
        for (r in allList) {
            val matchesStatus = "All".equals(selectedStatus, ignoreCase = true) ||
                    r.status.equals(selectedStatus, ignoreCase = true)
            val matchesQuery = query.isEmpty() ||
                    r.id.lowercase().contains(query) ||
                    r.status.lowercase().contains(query)

            if (matchesStatus && matchesQuery) {
                filteredList.add(r)
            }
        }
        adapter.notifyDataSetChanged()
    }

    // RecyclerView Adapter for displaying reservation items
    inner class ReservationAdapter : RecyclerView.Adapter<ReservationAdapter.ViewHolder>() {

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
            val v = LayoutInflater.from(parent.context).inflate(R.layout.item_reservation, parent, false)
            return ViewHolder(v)
        }

        override fun onBindViewHolder(holder: ViewHolder, position: Int) {
            val r = filteredList[position]
            holder.tvResId.text = "Booking #${if (r.id.length > 8) r.id.substring(0, 8) else r.id}"
            holder.tvResStatus.text = r.status
            holder.tvResDate.text = "Date: ${if (r.reservationDate.length >= 10) r.reservationDate.substring(0, 10) else r.reservationDate}"
            holder.tvResKWh.text = "Energy: ${r.energyKWh} kWh"

            holder.itemView.setOnClickListener {
                val intent = Intent(this@ReservationListActivity, ReservationDetailActivity::class.java)
                intent.putExtra("resId", r.id)
                startActivity(intent)
            }
        }

        override fun getItemCount(): Int = filteredList.size

        // ViewHolder class for reservation item views
        inner class ViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
            val tvResId: TextView = itemView.findViewById(R.id.tvResId)
            val tvResStatus: TextView = itemView.findViewById(R.id.tvResStatus)
            val tvResDate: TextView = itemView.findViewById(R.id.tvResDate)
            val tvResKWh: TextView = itemView.findViewById(R.id.tvResKWh)
        }
    }
}
