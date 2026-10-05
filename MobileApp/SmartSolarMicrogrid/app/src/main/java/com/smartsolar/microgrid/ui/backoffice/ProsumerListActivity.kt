package com.smartsolar.microgrid.ui.backoffice

import android.os.Bundle
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.google.android.material.button.MaterialButton
import com.google.android.material.card.MaterialCardView
import com.smartsolar.microgrid.R
import com.smartsolar.microgrid.api.ApiClient
import com.smartsolar.microgrid.data.SessionManager
import org.json.JSONArray

/**
 * Backoffice Prosumer Management Activity.
 * Displays all registered prosumers and allows administrators
 * to activate, deactivate, or reactivate prosumer accounts.
 */
class ProsumerListActivity : AppCompatActivity() {

    private lateinit var session: SessionManager
    private lateinit var llProsumersContainer: LinearLayout
    private lateinit var tvProsumersSubtitle: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        session = SessionManager(this)

        setContentView(R.layout.activity_prosumer_list)

        llProsumersContainer = findViewById(R.id.llProsumersContainer)
        tvProsumersSubtitle = findViewById(R.id.tvProsumersSubtitle)

        // Top-left back arrow navigation
        findViewById<ImageView>(R.id.ivProsumersBack).setOnClickListener {
            finish()
        }

        loadProsumers()
    }

    override fun onResume() {
        super.onResume()
        loadProsumers()
    }

    /**
     * Fetches all registered prosumers from the central API.
     */
    private fun loadProsumers() {

        val token = session.getToken()

        ApiClient.request("prosumer", "GET", null, token, object : ApiClient.ApiCallback {

            override fun onSuccess(response: String) {
                try {
                    val prosumers = JSONArray(response)
                    renderProsumerList(prosumers)
                } catch (e: Exception) {
                    Toast.makeText(this@ProsumerListActivity, "Unable to read prosumer list.", Toast.LENGTH_SHORT).show()
                }
            }

            override fun onError(error: String) {
                Toast.makeText(this@ProsumerListActivity, "Failed to load prosumers: $error", Toast.LENGTH_LONG).show()
            }
        })
    }

    /**
     * Renders the cards for each prosumer dynamically.
     */
    private fun renderProsumerList(prosumers: JSONArray) {

        llProsumersContainer.removeAllViews()

        val total = prosumers.length()
        tvProsumersSubtitle.text = "Total Registered Prosumers: $total"

        if (total == 0) {
            val emptyTv = TextView(this).apply {
                text = "No prosumer accounts found."
                setTextColor(ContextCompat.getColor(this@ProsumerListActivity, R.color.register_text_secondary))
                textSize = 14f
                setPadding(0, 20, 0, 0)
            }
            llProsumersContainer.addView(emptyTv)
            return
        }

        for (i in 0 until total) {
            try {
                val p = prosumers.getJSONObject(i)
                val nic = p.optString("nic", p.optString("nIC"))
                val firstName = p.optString("firstName", "")
                val lastName = p.optString("lastName", "")
                val name = "$firstName $lastName".trim().ifEmpty { "Prosumer ($nic)" }
                val email = p.optString("email", "N/A")
                val phone = p.optString("phone", "N/A")
                val status = p.optString("status", "Active")

                addProsumerCard(nic, name, email, phone, status)

            } catch (_: Exception) { }
        }
    }

    /**
     * Constructs and attaches a single prosumer management card.
     */
    private fun addProsumerCard(
        nic: String,
        name: String,
        email: String,
        phone: String,
        status: String
    ) {
        val textPrimaryColor = ContextCompat.getColor(this, R.color.register_text_primary)
        val textSecondaryColor = ContextCompat.getColor(this, R.color.register_text_secondary)

        val card = MaterialCardView(this).apply {
            radius = 16f * resources.displayMetrics.density
            strokeWidth = (1f * resources.displayMetrics.density).toInt()
            strokeColor = ContextCompat.getColor(this@ProsumerListActivity, R.color.register_border)
            setCardBackgroundColor(ContextCompat.getColor(this@ProsumerListActivity, R.color.register_surface))
            cardElevation = 0f
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { setMargins(0, 0, 0, (14 * resources.displayMetrics.density).toInt()) }
        }

        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            val p = (16 * resources.displayMetrics.density).toInt()
            setPadding(p, p, p, p)
        }

        // Header row: Name + Status Badge
        val headerRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = android.view.Gravity.CENTER_VERTICAL
        }

        val tvName = TextView(this).apply {
            text = name
            textSize = 16f
            setTypeface(typeface, android.graphics.Typeface.BOLD)
            setTextColor(textPrimaryColor)
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        }

        val (statusText, statusColor) = when {
            status.equals("Active", ignoreCase = true) -> "● ACTIVE" to R.color.status_active
            status.equals("Pending", ignoreCase = true) -> "⏳ PENDING" to R.color.status_pending
            else -> "✖ DEACTIVATED" to R.color.status_cancelled
        }

        val tvStatus = TextView(this).apply {
            text = statusText
            textSize = 11f
            setTypeface(typeface, android.graphics.Typeface.BOLD)
            setTextColor(ContextCompat.getColor(this@ProsumerListActivity, statusColor))
        }

        headerRow.addView(tvName)
        headerRow.addView(tvStatus)
        layout.addView(headerRow)

        // Details: NIC, Email, Phone
        val tvDetails = TextView(this).apply {
            text = "NIC: $nic\nEmail: $email | Phone: $phone"
            textSize = 12f
            setTextColor(textSecondaryColor)
            setLineSpacing(4f, 1f)
            val m = (8 * resources.displayMetrics.density).toInt()
            setPadding(0, m, 0, m)
        }
        layout.addView(tvDetails)

        // Action Button
        val isPending = status.equals("Pending", ignoreCase = true)
        val isActive = status.equals("Active", ignoreCase = true)

        val btnAction = MaterialButton(this).apply {
            text = when {
                isPending -> "✅ Approve & Activate"
                isActive -> "⛔ Deactivate Account"
                else -> "🔄 Reactivate Account"
            }
            backgroundTintList = ContextCompat.getColorStateList(
                this@ProsumerListActivity,
                when {
                    isPending -> R.color.energy_cyan
                    isActive -> R.color.register_surface
                    else -> R.color.register_primary
                }
            )
            setTextColor(
                ContextCompat.getColor(
                    this@ProsumerListActivity,
                    if (isActive) R.color.register_error else R.color.white
                )
            )
            if (isActive) {
                strokeColor = ContextCompat.getColorStateList(this@ProsumerListActivity, R.color.register_error)
                strokeWidth = (1 * resources.displayMetrics.density).toInt()
            }
            textSize = 13f
            isAllCaps = false
            cornerRadius = (12 * resources.displayMetrics.density).toInt()
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                (48 * resources.displayMetrics.density).toInt()
            ).apply { setMargins(0, (6 * resources.displayMetrics.density).toInt(), 0, 0) }
        }

        btnAction.setOnClickListener {
            val actionType = when {
                isPending -> "Activate"
                isActive -> "Deactivate"
                else -> "Reactivate"
            }
            val targetEndpoint = if (isActive) "prosumer/$nic/deactivate" else "prosumer/$nic/activate"
            val httpMethod = "PUT"

            AlertDialog.Builder(this)
                .setTitle("$actionType Prosumer")
                .setMessage("Are you sure you want to ${actionType.lowercase()} prosumer $name ($nic)?")
                .setPositiveButton("Confirm") { _, _ ->
                    ApiClient.request(targetEndpoint, httpMethod, null, session.getToken(), object : ApiClient.ApiCallback {
                        override fun onSuccess(response: String) {
                            Toast.makeText(
                                this@ProsumerListActivity,
                                "Prosumer $nic $actionType.lowercase()d successfully!",
                                Toast.LENGTH_SHORT
                            ).show()
                            loadProsumers()
                        }

                        override fun onError(error: String) {
                            Toast.makeText(this@ProsumerListActivity, "Failed: $error", Toast.LENGTH_LONG).show()
                        }
                    })
                }
                .setNegativeButton("Cancel", null)
                .show()
        }

        layout.addView(btnAction)
        card.addView(layout)
        llProsumersContainer.addView(card)
    }
}