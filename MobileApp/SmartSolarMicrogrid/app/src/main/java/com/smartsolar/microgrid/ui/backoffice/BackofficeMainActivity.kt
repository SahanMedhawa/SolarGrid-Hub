package com.smartsolar.microgrid.ui.backoffice

import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import com.smartsolar.microgrid.R
import com.smartsolar.microgrid.api.ApiClient
import com.smartsolar.microgrid.data.SessionManager
import com.smartsolar.microgrid.ui.auth.LoginActivity
import org.json.JSONArray
import org.json.JSONObject

/**
 * Backoffice Administration Dashboard Activity.
 * Provides system admin functions: prosumer activation/reactivation,
 * node management overview, and pending booking counts.
 */
class BackofficeMainActivity : AppCompatActivity() {

    private lateinit var session: SessionManager
    private lateinit var tvAdminWelcome: TextView
    private lateinit var tvActiveNodesCount: TextView
    private lateinit var tvPendingProsumersCount: TextView
    private lateinit var tvPendingBookingsCount: TextView
    private lateinit var llPendingProsumersList: LinearLayout
    private lateinit var llDeactivatedProsumersList: LinearLayout
    private lateinit var llNodesList: LinearLayout

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        session = SessionManager(this)
        setContentView(R.layout.activity_backoffice_main)

        tvAdminWelcome = findViewById(R.id.tvAdminWelcome)
        tvActiveNodesCount = findViewById(R.id.tvActiveNodesCount)
        tvPendingProsumersCount = findViewById(R.id.tvPendingProsumersCount)
        tvPendingBookingsCount = findViewById(R.id.tvPendingBookingsCount)
        llPendingProsumersList = findViewById(R.id.llPendingProsumersList)
        llDeactivatedProsumersList = findViewById(R.id.llDeactivatedProsumersList)
        llNodesList = findViewById(R.id.llNodesList)

        tvAdminWelcome.text = "Welcome, ${session.getDisplayName()}"

        findViewById<Button>(R.id.btnRefreshBackoffice).setOnClickListener { loadPortalData() }

        findViewById<Button>(R.id.btnBackofficeLogout).setOnClickListener {
            session.logout()
            startActivity(Intent(this, LoginActivity::class.java))
            finish()
        }
    }

    override fun onResume() {
        super.onResume()
        loadPortalData()
    }

    // Load all portal data: prosumers, nodes, and reservations from the central API
    private fun loadPortalData() {
        val token = session.getToken()

        // 1. Fetch Prosumers (to find Pending and Deactivated)
        ApiClient.request("prosumer", "GET", null, token, object : ApiClient.ApiCallback {
            override fun onSuccess(response: String) {
                try {
                    val prosumers = JSONArray(response)
                    renderProsumers(prosumers)
                } catch (e: Exception) {
                    Toast.makeText(this@BackofficeMainActivity, "Error parsing prosumers", Toast.LENGTH_SHORT).show()
                }
            }

            override fun onError(error: String) {
                Toast.makeText(this@BackofficeMainActivity, "Prosumers: $error", Toast.LENGTH_SHORT).show()
            }
        })

        // 2. Fetch Nodes
        ApiClient.request("microgridnode", "GET", null, token, object : ApiClient.ApiCallback {
            override fun onSuccess(response: String) {
                try {
                    val nodes = JSONArray(response)
                    renderNodes(nodes)
                } catch (_: Exception) { }
            }

            override fun onError(error: String) { }
        })

        // 3. Fetch Reservations
        ApiClient.request("reservation", "GET", null, token, object : ApiClient.ApiCallback {
            override fun onSuccess(response: String) {
                try {
                    val reservations = JSONArray(response)
                    var pendingCount = 0
                    for (i in 0 until reservations.length()) {
                        if ("Pending".equals(reservations.getJSONObject(i).optString("status"), ignoreCase = true)) {
                            pendingCount++
                        }
                    }
                    tvPendingBookingsCount.text = pendingCount.toString()
                } catch (_: Exception) { }
            }

            override fun onError(error: String) { }
        })
    }

    // Render pending and deactivated prosumer lists dynamically
    private fun renderProsumers(prosumers: JSONArray) {
        llPendingProsumersList.removeAllViews()
        llDeactivatedProsumersList.removeAllViews()

        var pendingCount = 0
        var deactivatedCount = 0

        for (i in 0 until prosumers.length()) {
            try {
                val p = prosumers.getJSONObject(i)
                val nic = p.optString("nic", p.optString("nIC"))
                val name = "${p.optString("firstName")} ${p.optString("lastName")}"
                val status = p.optString("status")
                val phone = p.optString("phone", "")

                if ("Pending".equals(status, ignoreCase = true)) {
                    pendingCount++
                    addProsumerItem(llPendingProsumersList, nic, name, status, phone, isActivate = true)
                } else if ("Deactivated".equals(status, ignoreCase = true)) {
                    deactivatedCount++
                    addProsumerItem(llDeactivatedProsumersList, nic, name, status, phone, isActivate = false)
                }
            } catch (_: Exception) { }
        }

        tvPendingProsumersCount.text = pendingCount.toString()

        if (pendingCount == 0) {
            val emptyTv = TextView(this).apply {
                text = "No pending prosumer registrations."
                setTextColor(Color.GRAY)
                setPadding(10, 10, 10, 10)
            }
            llPendingProsumersList.addView(emptyTv)
        }

        if (deactivatedCount == 0) {
            val emptyTv = TextView(this).apply {
                text = "No deactivated accounts."
                setTextColor(Color.GRAY)
                setPadding(10, 10, 10, 10)
            }
            llDeactivatedProsumersList.addView(emptyTv)
        }
    }

    // Add a single prosumer card item to the specified container layout
    private fun addProsumerItem(
        container: LinearLayout, nic: String, name: String,
        status: String, phone: String, isActivate: Boolean
    ) {
        val item = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(14, 14, 14, 14)
            setBackgroundResource(R.drawable.card_bg)
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { setMargins(0, 0, 0, 10) }
        }

        val tvTitle = TextView(this).apply {
            text = "$name ($nic)"
            textSize = 14f
            setTextColor(Color.BLACK)
        }
        item.addView(tvTitle)

        val tvSub = TextView(this).apply {
            text = "Status: $status | Phone: $phone"
            textSize = 12f
            setTextColor(Color.DKGRAY)
        }
        item.addView(tvSub)

        val btnAction = Button(this).apply {
            text = if (isActivate) "✅ Approve & Activate" else "🔄 Reactivate Account"
            setBackgroundColor(if (isActivate) Color.parseColor("#198754") else Color.parseColor("#0d6efd"))
            setTextColor(Color.WHITE)
            textSize = 12f
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, 110
            ).apply { setMargins(0, 8, 0, 0) }
        }

        btnAction.setOnClickListener {
            val actionName = if (isActivate) "Activate" else "Reactivate"
            AlertDialog.Builder(this)
                .setTitle("$actionName Prosumer")
                .setMessage("Are you sure you want to ${actionName.lowercase()} prosumer $nic?")
                .setPositiveButton("Confirm") { _, _ ->
                    // PUT prosumer/{nic}/activate handles both activate and reactivate
                    ApiClient.request("prosumer/$nic/activate", "PUT", null, session.getToken(), object : ApiClient.ApiCallback {
                        override fun onSuccess(response: String) {
                            Toast.makeText(
                                this@BackofficeMainActivity,
                                "Prosumer $nic ${actionName.lowercase()}d successfully!",
                                Toast.LENGTH_SHORT
                            ).show()
                            loadPortalData()
                        }

                        override fun onError(error: String) {
                            Toast.makeText(this@BackofficeMainActivity, "Failed: $error", Toast.LENGTH_LONG).show()
                        }
                    })
                }
                .setNegativeButton("Cancel", null)
                .show()
        }

        item.addView(btnAction)
        container.addView(item)
    }

    // Render microgrid nodes list and count active nodes
    private fun renderNodes(nodes: JSONArray) {
        llNodesList.removeAllViews()
        var activeCount = 0

        for (i in 0 until nodes.length()) {
            try {
                val node = nodes.getJSONObject(i)
                val isActive = node.optBoolean("isActive", true)
                if (isActive) activeCount++

                val item = LinearLayout(this).apply {
                    orientation = LinearLayout.VERTICAL
                    setPadding(14, 14, 14, 14)
                    setBackgroundResource(R.drawable.card_bg)
                    layoutParams = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                    ).apply { setMargins(0, 0, 0, 10) }
                }

                val tvNodeName = TextView(this).apply {
                    text = "${node.optString("nodeName")} (${if (isActive) "ACTIVE" else "INACTIVE"})"
                    textSize = 14f
                    setTextColor(if (isActive) Color.parseColor("#198754") else Color.RED)
                }
                item.addView(tvNodeName)

                val tvNodeInfo = TextView(this).apply {
                    text = "Location: ${node.optString("location")}" +
                            " | Capacity: ${node.optDouble("capacityKWh", 0.0)} kWh" +
                            "\nBattery Slots: ${node.optInt("batterySlots", 0)}" +
                            " | Available: ${node.optInt("availableBatterySlots", 0)}" +
                            "\nSchedule: ${node.optString("schedule", "06:00-18:00")}"
                    textSize = 12f
                    setTextColor(Color.DKGRAY)
                }
                item.addView(tvNodeInfo)

                llNodesList.addView(item)
            } catch (_: Exception) { }
        }

        tvActiveNodesCount.text = activeCount.toString()
    }
}
