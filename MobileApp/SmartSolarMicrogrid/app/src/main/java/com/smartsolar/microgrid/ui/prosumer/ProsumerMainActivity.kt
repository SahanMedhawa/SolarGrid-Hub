package com.smartsolar.microgrid.ui.prosumer

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.bottomnavigation.BottomNavigationView
import com.smartsolar.microgrid.R
import com.smartsolar.microgrid.api.ApiClient
import com.smartsolar.microgrid.data.SessionManager
import com.smartsolar.microgrid.ui.auth.LoginActivity
import org.json.JSONArray
import org.json.JSONObject

/**
 * Prosumer Main Dashboard Activity.
 * Displays active/pending reservation counts and provides navigation
 * to booking, reservation list, nearby nodes map, and profile screens.
 */
class ProsumerMainActivity : AppCompatActivity() {

    private lateinit var session: SessionManager
    private lateinit var tvWelcome: TextView
    private lateinit var tvApprovedCount: TextView
    private lateinit var tvPendingCount: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        session = SessionManager(this)
        setContentView(R.layout.activity_prosumer_main)

        tvWelcome = findViewById(R.id.tvWelcome)
        tvApprovedCount = findViewById(R.id.tvApprovedCount)
        tvPendingCount = findViewById(R.id.tvPendingCount)

        tvWelcome.text = "Welcome, ${session.getDisplayName()}"

        findViewById<Button>(R.id.btnBookSlot).setOnClickListener {
            startActivity(Intent(this, CreateReservationActivity::class.java))
        }

        findViewById<Button>(R.id.btnMyBookings).setOnClickListener {
            startActivity(Intent(this, ReservationListActivity::class.java))
        }

        findViewById<Button>(R.id.btnNearbyNodes).setOnClickListener {
            startActivity(Intent(this, NearbyNodesActivity::class.java))
        }

        findViewById<Button>(R.id.btnProfile).setOnClickListener {
            startActivity(Intent(this, ProfileActivity::class.java))
        }

        findViewById<Button>(R.id.btnLogout).setOnClickListener {
            session.logout()
            startActivity(Intent(this, LoginActivity::class.java))
            finish()
        }

        // Bottom navigation: Home / Profile / Logout
        val bottomNav = findViewById<BottomNavigationView>(R.id.bottomNavProsumer)
        bottomNav.selectedItemId = R.id.navHome
        bottomNav.setOnItemSelectedListener { item ->
            when (item.itemId) {
                R.id.navHome -> true
                R.id.navProfile -> {
                    startActivity(Intent(this, ProfileActivity::class.java))
                    overridePendingTransition(0, 0)
                    true
                }
                R.id.navLogout -> {
                    session.logout()
                    startActivity(Intent(this, LoginActivity::class.java))
                    finish()
                    true
                }
                else -> false
            }
        }
    }

    override fun onResume() {
        super.onResume()
        loadDashboardData()
        val bottomNav = findViewById<BottomNavigationView?>(R.id.bottomNavProsumer)
        bottomNav?.selectedItemId = R.id.navHome
    }

    // Fetch dashboard counts from the central API, falling back to local SQLite cache
    private fun loadDashboardData() {
        val nic = session.getUserNic()
        val token = session.getToken()

        // 1. Fetch Approved Future Count
        ApiClient.request("reservation/prosumer/$nic/future-count", "GET", null, token, object : ApiClient.ApiCallback {
            override fun onSuccess(response: String) {
                try {
                    val res = JSONObject(response)
                    tvApprovedCount.text = res.optInt("count", 0).toString()
                } catch (_: Exception) { }
            }

            override fun onError(error: String) {
                // Fallback to SQLite cache
                val cached = session.dbHelper.getCachedReservations(nic)
                val approved = cached.count { it.status.equals("Approved", ignoreCase = true) }
                tvApprovedCount.text = approved.toString()
            }
        })

        // 2. Fetch Prosumer's pending reservations count
        ApiClient.request("reservation/prosumer/$nic", "GET", null, token, object : ApiClient.ApiCallback {
            override fun onSuccess(response: String) {
                try {
                    val arr = JSONArray(response)
                    var pending = 0
                    for (i in 0 until arr.length()) {
                        if ("Pending".equals(arr.getJSONObject(i).getString("status"), ignoreCase = true)) {
                            pending++
                        }
                    }
                    tvPendingCount.text = pending.toString()
                } catch (_: Exception) { }
            }

            override fun onError(error: String) {
                // Fallback to SQLite cache
                val cached = session.dbHelper.getCachedReservations(nic)
                val pending = cached.count { it.status.equals("Pending", ignoreCase = true) }
                tvPendingCount.text = pending.toString()
            }
        })
    }
}