package com.smartsolar.microgrid.ui.operator

import android.app.DatePickerDialog
import android.app.TimePickerDialog
import android.os.Bundle
import android.view.View
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
import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar
import java.util.Locale

class NodeManagementActivity : AppCompatActivity() {
    private lateinit var session: SessionManager
    private lateinit var llOperatorNodesList: LinearLayout
    private var selectedNodeId: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        session = SessionManager(this)
        setContentView(R.layout.activity_operator_node_management)
        llOperatorNodesList = findViewById(R.id.llOperatorNodesList)
        findViewById<Button>(R.id.btnBackToOperator).setOnClickListener { finish() }
        findViewById<Button>(R.id.btnRefreshOperatorNodes).setOnClickListener { loadOperatorNodes() }
        loadOperatorNodes()
    }
    private fun loadOperatorNodes() {
        ApiClient.request("microgridnode", "GET", null, session.getToken(), object : ApiClient.ApiCallback {
            override fun onSuccess(response: String) {
                try {
                    renderOperatorNodes(JSONArray(response))
                } catch (_: Exception) {
                    Toast.makeText(this@NodeManagementActivity, "Could not read nodes", Toast.LENGTH_SHORT).show()
                }
            }
            override fun onError(error: String) {
                Toast.makeText(this@NodeManagementActivity, "Nodes: $error", Toast.LENGTH_SHORT).show()
            }
        })
    }

    private fun renderOperatorNodes(nodes: JSONArray) {
        llOperatorNodesList.removeAllViews()
        if (nodes.length() == 0) {
            llOperatorNodesList.addView(TextView(this).apply {
                text = "No microgrid nodes found."
                textSize = 14f
                setTextColor(ContextCompat.getColor(this@NodeManagementActivity, R.color.text_secondary))
                setPadding(20, 20, 20, 20)
            })
            return
        }
        for (i in 0 until nodes.length()) {
            val node = nodes.optJSONObject(i) ?: continue
            val id = node.optString("id")
            val card = MaterialCardView(this).apply {
                radius = 14f * resources.displayMetrics.density
                strokeWidth = (1f * resources.displayMetrics.density).toInt()
                val isActive = node.optBoolean("isActive", true)
                strokeColor = ContextCompat.getColor(
                    this@NodeManagementActivity,
                    if (isActive) R.color.status_active else R.color.status_cancelled
                )
                setCardBackgroundColor(ContextCompat.getColor(this@NodeManagementActivity, R.color.card_background_elevated))
                layoutParams = LinearLayout.LayoutParams(-1, -2).apply {
                    bottomMargin = (8 * resources.displayMetrics.density).toInt()
                }
            }
            val body = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                val p = (14 * resources.displayMetrics.density).toInt()
                setPadding(p, p, p, p)
            }
            body.addView(TextView(this).apply {
                val isActive = node.optBoolean("isActive", true)
                text = "${node.optString("nodeName", "Microgrid Node")}  |  ${if (isActive) "Active" else "Inactive"}"
                textSize = 16f
                setTypeface(typeface, android.graphics.Typeface.BOLD)
                setTextColor(ContextCompat.getColor(this@NodeManagementActivity, if (isActive) R.color.status_active else R.color.status_cancelled))
            })
            body.addView(TextView(this).apply {
                text = "${node.optString("location", "Location unavailable")}\nCapacity: ${node.optDouble("capacityKWh", 0.0)} kWh  |  Schedule: ${node.optString("schedule", "Not specified")}"
                textSize = 13f
                setTextColor(ContextCompat.getColor(this@NodeManagementActivity, R.color.accent))
                setPadding(0, (5 * resources.displayMetrics.density).toInt(), 0, (8 * resources.displayMetrics.density).toInt())
            })
            val action = Button(this).apply {
                text = if (selectedNodeId == id) "Hide battery slots" else "Manage battery slots"
                setBackgroundColor(ContextCompat.getColor(this@NodeManagementActivity, if (selectedNodeId == id) R.color.accent else R.color.primary))
                setTextColor(ContextCompat.getColor(this@NodeManagementActivity, R.color.white))
                setOnClickListener {
                    if (selectedNodeId == id) {
                        selectedNodeId = null
                        loadOperatorNodes()
                    } else {
                        selectedNodeId = id
                        loadOperatorNodes()
                    }
                }
            }
            body.addView(action)
            if (selectedNodeId == id) body.addView(LinearLayout(this).apply {
                tag = "operator_slots_$id"
                orientation = LinearLayout.VERTICAL
                addView(TextView(this@NodeManagementActivity).apply {
                    text = "Loading battery slots..."
                    textSize = 13f
                    setTextColor(ContextCompat.getColor(this@NodeManagementActivity, R.color.text_secondary))
                })
            })
            card.addView(body)
            llOperatorNodesList.addView(card)
            if (selectedNodeId == id) loadOperatorSlots(id, node)
        }
    }

    private fun loadOperatorSlots(nodeId: String, node: JSONObject) {
        ApiClient.request("energyslot/node/$nodeId", "GET", null, session.getToken(), object : ApiClient.ApiCallback {
            override fun onSuccess(response: String) {
                if (selectedNodeId != nodeId) return
                try { renderOperatorSlots(nodeId, node, JSONArray(response)) }
                catch (_: Exception) { Toast.makeText(this@NodeManagementActivity, "Could not read battery slots", Toast.LENGTH_SHORT).show() }
            }
            override fun onError(error: String) {
                Toast.makeText(this@NodeManagementActivity, "Slots: $error", Toast.LENGTH_SHORT).show()
            }
        })
    }

    private fun renderOperatorSlots(nodeId: String, node: JSONObject, slots: JSONArray) {
        val card = (0 until llOperatorNodesList.childCount)
            .mapNotNull { llOperatorNodesList.getChildAt(it) as? MaterialCardView }
            .firstOrNull { candidate ->
                (candidate.getChildAt(0) as? LinearLayout)
                    ?.findViewWithTag<View>("operator_slots_$nodeId") != null
            } ?: return
        val body = card.getChildAt(0) as LinearLayout
        val container = body.findViewWithTag<LinearLayout>("operator_slots_$nodeId") ?: return
        container.removeAllViews()
        var activeKwh = 0.0
        var maintenanceKwh = 0.0
        for (i in 0 until slots.length()) {
            val slot = slots.optJSONObject(i) ?: continue
            if (slot.optString("status") == "Maintenance") maintenanceKwh += slot.optDouble("availableKWh") else activeKwh += slot.optDouble("availableKWh")
        }
        container.addView(TextView(this).apply {
            text = "Active capacity: $activeKwh kWh  |  Maintenance: $maintenanceKwh kWh  |  Station total: ${node.optDouble("capacityKWh", 0.0)} kWh"
            textSize = 12f
            setTextColor(ContextCompat.getColor(this@NodeManagementActivity, R.color.accent))
            setPadding(0, 4, 0, 8)
        })
        if (slots.length() == 0) container.addView(TextView(this).apply { text = "No battery slots configured."; textSize = 13f })
        for (i in 0 until slots.length()) {
            val slot = slots.optJSONObject(i) ?: continue
            val slotId = slot.optString("id")
            val number = slot.optInt("slotNumber", i + 1)
            val maintenance = slot.optString("status").equals("Maintenance", true)
            val line = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(0, 6, 0, 6)
            }
            line.addView(TextView(this).apply {
                val window = if (maintenance && slot.optString("maintenanceDate").isNotEmpty()) "\n${slot.optString("maintenanceDate").take(10)} | ${slot.optString("maintenanceStartTime")}-${slot.optString("maintenanceEndTime")}" else ""
                text = "Slot $number | ${slot.optDouble("availableKWh")} kWh | ${slot.optString("status")}$window"
                textSize = 13f
                setTextColor(ContextCompat.getColor(this@NodeManagementActivity, if (maintenance) R.color.status_pending else R.color.status_active))
            })
            val button = Button(this).apply {
                text = if (maintenance) "Return to service" else "Schedule maintenance"
                if (!maintenance) {
                    setBackgroundColor(ContextCompat.getColor(this@NodeManagementActivity, R.color.status_completed))
                    setTextColor(ContextCompat.getColor(this@NodeManagementActivity, R.color.white))
                }
                setOnClickListener { if (maintenance) setSlotMaintenance(nodeId, node, slotId, false, null, null, null) else showMaintenanceDialog(nodeId, node, slotId, number) }
            }
            line.addView(button)
            container.addView(line)
        }
    }

    private fun showMaintenanceDialog(nodeId: String, node: JSONObject, slotId: String, number: Int) {
        val now = Calendar.getInstance()
        val selectedDate = Calendar.getInstance().apply { add(Calendar.HOUR_OF_DAY, 1); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0) }
        DatePickerDialog(this, { _, year, month, day ->
            val date = String.format(Locale.US, "%04d-%02d-%02d", year, month + 1, day)
            val start = Calendar.getInstance().apply { set(Calendar.HOUR_OF_DAY, (now.get(Calendar.HOUR_OF_DAY) + 1) % 24); set(Calendar.MINUTE, 0) }
            TimePickerDialog(this, { _, hour, minute ->
                val startTime = String.format(Locale.US, "%02d:%02d", hour, minute)
                val startDisplayTime = formatDisplayTime(hour, minute)
                val endDefault = (hour + 1) % 24
                TimePickerDialog(this, { _, endHour, endMinute ->
                    val endTime = String.format(Locale.US, "%02d:%02d", endHour, endMinute)
                    val endDisplayTime = formatDisplayTime(endHour, endMinute)
                    if (endTime <= startTime) {
                        Toast.makeText(this, "Finish time must be later than start time.", Toast.LENGTH_SHORT).show()
                        return@TimePickerDialog
                    }
                    AlertDialog.Builder(this).setTitle("Schedule slot maintenance")
                        .setMessage("Slot $number will be unavailable on $date from $startDisplayTime to $endDisplayTime. Active reservations during this window will prevent scheduling.")
                        .setPositiveButton("Schedule") { _, _ -> setSlotMaintenance(nodeId, node, slotId, true, date, startTime, endTime) }
                        .setNegativeButton("Cancel", null).show()
                }, endDefault, 0, false).show()
            }, start.get(Calendar.HOUR_OF_DAY), 0, false).show()
        }, selectedDate.get(Calendar.YEAR), selectedDate.get(Calendar.MONTH), selectedDate.get(Calendar.DAY_OF_MONTH)).apply {
            datePicker.minDate = now.timeInMillis
        }.show()
    }

    private fun formatDisplayTime(hour: Int, minute: Int): String {
        val calendar = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, hour)
            set(Calendar.MINUTE, minute)
        }
        return java.text.SimpleDateFormat("hh:mm a", Locale.US).format(calendar.time)
    }

    private fun setSlotMaintenance(nodeId: String, node: JSONObject, slotId: String, maintenance: Boolean, date: String?, start: String?, end: String?) {
        val payload = JSONObject().put("underMaintenance", maintenance)
        if (maintenance) payload.put("maintenanceDate", date).put("startTime", start).put("endTime", end)
        ApiClient.request("energyslot/$slotId/maintenance", "PUT", payload, session.getToken(), object : ApiClient.ApiCallback {
            override fun onSuccess(response: String) {
                val message = try { JSONObject(response).optString("message", "Battery slot updated.") } catch (_: Exception) { "Battery slot updated." }
                Toast.makeText(this@NodeManagementActivity, message, Toast.LENGTH_LONG).show()
                loadOperatorSlots(nodeId, node)
            }
            override fun onError(error: String) { Toast.makeText(this@NodeManagementActivity, error, Toast.LENGTH_LONG).show(); loadOperatorSlots(nodeId, node) }
        })
    }

}
