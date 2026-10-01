package com.smartsolar.microgrid.ui.backoffice
import com.smartsolar.microgrid.ui.operator.ProfileActivity
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.google.android.material.card.MaterialCardView
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

        findViewById<Button>(R.id.btnMyProfile).setOnClickListener {
            startActivity(Intent(this, ProfileActivity::class.java))
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

        val textSecondaryColor = ContextCompat.getColor(this, R.color.text_secondary)
        if (pendingCount == 0) {
            val emptyTv = TextView(this).apply {
                text = "No pending prosumer registrations."
                setTextColor(textSecondaryColor)
                setPadding(10, 10, 10, 10)
            }
            llPendingProsumersList.addView(emptyTv)
        }

        if (deactivatedCount == 0) {
            val emptyTv = TextView(this).apply {
                text = "No deactivated accounts."
                setTextColor(textSecondaryColor)
                setPadding(10, 10, 10, 10)
            }
            llDeactivatedProsumersList.addView(emptyTv)
        }
    }

    // Add a single prosumer card item
    private fun addProsumerItem(
        container: LinearLayout, nic: String, name: String,
        status: String, phone: String, isActivate: Boolean
    ) {
        val textPrimaryColor = ContextCompat.getColor(this, R.color.text_primary)
        val textSecondaryColor = ContextCompat.getColor(this, R.color.text_secondary)

        val card = MaterialCardView(this).apply {
            radius = 14f * resources.displayMetrics.density
            strokeWidth = (1f * resources.displayMetrics.density).toInt()
            strokeColor = ContextCompat.getColor(this@BackofficeMainActivity, R.color.card_border)
            setCardBackgroundColor(ContextCompat.getColor(this@BackofficeMainActivity, R.color.card_background))
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { setMargins(0, 0, 0, (10 * resources.displayMetrics.density).toInt()) }
        }

        val item = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            val p = (14 * resources.displayMetrics.density).toInt()
            setPadding(p, p, p, p)
        }

        val tvTitle = TextView(this).apply {
            text = "$name ($nic)"
            textSize = 14f
            setTypeface(typeface, android.graphics.Typeface.BOLD)
            setTextColor(textPrimaryColor)
        }
        item.addView(tvTitle)

        val tvSub = TextView(this).apply {
            text = "Status: $status | Phone: $phone"
            textSize = 12f
            setTextColor(textSecondaryColor)
            val m = (4 * resources.displayMetrics.density).toInt()
            setPadding(0, m, 0, m)
        }
        item.addView(tvSub)

        val btnAction = Button(this).apply {
            text = if (isActivate) "✅ Approve & Activate" else "🔄 Reactivate Account"
            setBackgroundColor(if (isActivate) ContextCompat.getColor(this@BackofficeMainActivity, R.color.primary) else ContextCompat.getColor(this@BackofficeMainActivity, R.color.accent))
            setTextColor(Color.WHITE)
            textSize = 12f
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                (46 * resources.displayMetrics.density).toInt()
            ).apply { setMargins(0, (6 * resources.displayMetrics.density).toInt(), 0, 0) }
        }

        btnAction.setOnClickListener {
            val actionName = if (isActivate) "Activate" else "Reactivate"
            AlertDialog.Builder(this)
                .setTitle("$actionName Prosumer")
                .setMessage("Are you sure you want to ${actionName.lowercase()} prosumer $nic?")
                .setPositiveButton("Confirm") { _, _ ->
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
        card.addView(item)
        container.addView(card)
    }

    // Render microgrid nodes list
    private fun renderNodes(nodes: JSONArray) {
        llNodesList.removeAllViews()
        var activeCount = 0

        val textPrimaryColor = ContextCompat.getColor(this, R.color.text_primary)
        val textSecondaryColor = ContextCompat.getColor(this, R.color.text_secondary)

        for (i in 0 until nodes.length()) {
            try {
                val node = nodes.getJSONObject(i)
                val isActive = node.optBoolean("isActive", true)
                if (isActive) activeCount++

                val card = MaterialCardView(this).apply {
                    radius = 14f * resources.displayMetrics.density
                    strokeWidth = (1f * resources.displayMetrics.density).toInt()
                    strokeColor = ContextCompat.getColor(this@BackofficeMainActivity, R.color.card_border)
                    setCardBackgroundColor(ContextCompat.getColor(this@BackofficeMainActivity, R.color.card_background))
                    layoutParams = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                    ).apply { setMargins(0, 0, 0, (10 * resources.displayMetrics.density).toInt()) }
                }

                val item = LinearLayout(this).apply {
                    orientation = LinearLayout.VERTICAL
                    val p = (14 * resources.displayMetrics.density).toInt()
                    setPadding(p, p, p, p)
                }

                val tvNodeName = TextView(this).apply {
                    text = "${node.optString("nodeName")} (${if (isActive) "ACTIVE" else "INACTIVE"})"
                    textSize = 14f
                    setTypeface(typeface, android.graphics.Typeface.BOLD)
                    setTextColor(if (isActive) ContextCompat.getColor(this@BackofficeMainActivity, R.color.primary) else ContextCompat.getColor(this@BackofficeMainActivity, R.color.status_cancelled))
                }
                item.addView(tvNodeName)

                val tvNodeInfo = TextView(this).apply {
                    text = "Location: ${node.optString("location")}" +
                            " | Capacity: ${node.optDouble("capacityKWh", 0.0)} kWh" +
                            "\nBattery Slots: ${node.optInt("batterySlots", 0)}" +
                            " | Available: ${node.optInt("availableBatterySlots", 0)}" +
                            "\nSchedule: ${node.optString("schedule", "06:00-18:00")}"
                    textSize = 12f
                    setTextColor(textSecondaryColor)
                    setLineSpacing(3f, 1f)
                }
                item.addView(tvNodeInfo)

                card.addView(item)
                llNodesList.addView(card)
            } catch (_: Exception) { }
        }

        tvActiveNodesCount.text = activeCount.toString()
    }
}
