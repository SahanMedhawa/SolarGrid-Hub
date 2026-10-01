package com.smartsolar.microgrid.data

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import com.smartsolar.microgrid.models.Reservation

/**
 * Pure native SQLite Database Helper for local user management and offline caching.
 * Manages local user authentication state, profiles, and cached reservation records.
 */
class DatabaseHelper(context: Context) :
    SQLiteOpenHelper(context, DATABASE_NAME, null, DATABASE_VERSION) {

    companion object {
        private const val DATABASE_NAME = "SmartSolarMicrogrid.db"
        private const val DATABASE_VERSION = 3

        // Table: Local User
        const val TABLE_USER = "local_user"
        const val COL_USER_ID = "id"
        const val COL_USER_NIC = "nic"
        const val COL_USER_NAME = "name"
        const val COL_USER_ROLE = "role"
        const val COL_USER_TOKEN = "token"

        // Table: Cached Reservations
        const val TABLE_RESERVATIONS = "cached_reservations"
        const val COL_RES_ID = "id"
        const val COL_RES_NIC = "prosumer_nic"
        const val COL_RES_SLOT_ID = "slot_id"
        const val COL_RES_NODE_ID = "node_id"
        const val COL_RES_DATE = "reservation_date"
        const val COL_RES_START_TIME = "start_time"
        const val COL_RES_END_TIME = "end_time"
        const val COL_RES_ALLOCATED_SLOTS = "allocated_slots"
        const val COL_RES_KWH = "energy_kwh"
        const val COL_RES_STATUS = "status"
        const val COL_RES_QR = "qr_data"
    }

    override fun onCreate(db: SQLiteDatabase) {
        val createUserTable = """
            CREATE TABLE $TABLE_USER (
                $COL_USER_ID TEXT PRIMARY KEY,
                $COL_USER_NIC TEXT,
                $COL_USER_NAME TEXT,
                $COL_USER_ROLE TEXT,
                $COL_USER_TOKEN TEXT
            )
        """.trimIndent()

        val createResTable = """
            CREATE TABLE $TABLE_RESERVATIONS (
                $COL_RES_ID TEXT PRIMARY KEY,
                $COL_RES_NIC TEXT,
                $COL_RES_SLOT_ID TEXT,
                $COL_RES_NODE_ID TEXT,
                $COL_RES_DATE TEXT,
                $COL_RES_START_TIME TEXT,
                $COL_RES_END_TIME TEXT,
                $COL_RES_ALLOCATED_SLOTS TEXT,
                $COL_RES_KWH REAL,
                $COL_RES_STATUS TEXT,
                $COL_RES_QR TEXT
            )
        """.trimIndent()

        db.execSQL(createUserTable)
        db.execSQL(createResTable)
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        db.execSQL("DROP TABLE IF EXISTS $TABLE_USER")
        db.execSQL("DROP TABLE IF EXISTS $TABLE_RESERVATIONS")
        onCreate(db)
    }

    // Save or update active logged-in user in SQLite
    fun saveUser(id: String, nic: String, name: String, role: String, token: String) {
        val db = writableDatabase
        db.delete(TABLE_USER, null, null)

        val values = ContentValues().apply {
            put(COL_USER_ID, id)
            put(COL_USER_NIC, nic)
            put(COL_USER_NAME, name)
            put(COL_USER_ROLE, role)
            put(COL_USER_TOKEN, token)
        }

        db.insertWithOnConflict(TABLE_USER, null, values, SQLiteDatabase.CONFLICT_REPLACE)
    }

    // Query active local user from SQLite
    fun getLocalUser(): Map<String, String>? {
        val db = readableDatabase
        val cursor = db.query(TABLE_USER, null, null, null, null, null, null)
        cursor.use {
            if (it.moveToFirst()) {
                val map = HashMap<String, String>()
                map["id"] = it.getString(it.getColumnIndexOrThrow(COL_USER_ID)) ?: ""
                map["nic"] = it.getString(it.getColumnIndexOrThrow(COL_USER_NIC)) ?: ""
                map["name"] = it.getString(it.getColumnIndexOrThrow(COL_USER_NAME)) ?: ""
                map["role"] = it.getString(it.getColumnIndexOrThrow(COL_USER_ROLE)) ?: ""
                map["token"] = it.getString(it.getColumnIndexOrThrow(COL_USER_TOKEN)) ?: ""
                return map
            }
        }
        return null
    }

    // Clear user session from SQLite
    fun clearUser() {
        val db = writableDatabase
        db.delete(TABLE_USER, null, null)
    }

    // Cache reservations list in SQLite
    fun cacheReservations(list: List<Reservation>) {
        val db = writableDatabase
        db.beginTransaction()
        try {
            db.delete(TABLE_RESERVATIONS, null, null)
            for (r in list) {
                val values = ContentValues().apply {
                    put(COL_RES_ID, r.id)
                    put(COL_RES_NIC, r.prosumerNic)
                    put(COL_RES_SLOT_ID, r.slotId)
                    put(COL_RES_NODE_ID, r.nodeId)
                    put(COL_RES_DATE, r.reservationDate)
                    put(COL_RES_START_TIME, r.startTime)
                    put(COL_RES_END_TIME, r.endTime)
                    put(COL_RES_ALLOCATED_SLOTS, r.allocatedSlotIds.joinToString(","))
                    put(COL_RES_KWH, r.energyKWh)
                    put(COL_RES_STATUS, r.status)
                    put(COL_RES_QR, r.qrCodeData)
                }
                db.insertWithOnConflict(TABLE_RESERVATIONS, null, values, SQLiteDatabase.CONFLICT_REPLACE)
            }
            db.setTransactionSuccessful()
        } finally {
            db.endTransaction()
        }
    }

    // Query cached reservations from SQLite for a prosumer (or all if nic is blank)
    fun getCachedReservations(nic: String = ""): ArrayList<Reservation> {
        val list = ArrayList<Reservation>()
        val db = readableDatabase
        val selection = if (nic.isNotEmpty()) "$COL_RES_NIC = ?" else null
        val selectionArgs = if (nic.isNotEmpty()) arrayOf(nic) else null
        val cursor = db.query(TABLE_RESERVATIONS, null, selection, selectionArgs, null, null, "$COL_RES_DATE DESC")

        cursor.use {
            while (it.moveToNext()) {
                val slotsStr = it.getString(it.getColumnIndexOrThrow(COL_RES_ALLOCATED_SLOTS)) ?: ""
                val allocatedSlots = if (slotsStr.isNotEmpty()) slotsStr.split(",").map { s -> s.trim() }.filter { s -> s.isNotEmpty() } else emptyList()
                val r = Reservation(
                    id = it.getString(it.getColumnIndexOrThrow(COL_RES_ID)) ?: "",
                    prosumerNic = it.getString(it.getColumnIndexOrThrow(COL_RES_NIC)) ?: "",
                    slotId = it.getString(it.getColumnIndexOrThrow(COL_RES_SLOT_ID)) ?: "",
                    nodeId = it.getString(it.getColumnIndexOrThrow(COL_RES_NODE_ID)) ?: "",
                    reservationDate = it.getString(it.getColumnIndexOrThrow(COL_RES_DATE)) ?: "",
                    startTime = it.getString(it.getColumnIndexOrThrow(COL_RES_START_TIME)) ?: "",
                    endTime = it.getString(it.getColumnIndexOrThrow(COL_RES_END_TIME)) ?: "",
                    energyKWh = it.getDouble(it.getColumnIndexOrThrow(COL_RES_KWH)),
                    status = it.getString(it.getColumnIndexOrThrow(COL_RES_STATUS)) ?: "",
                    qrCodeData = it.getString(it.getColumnIndexOrThrow(COL_RES_QR)) ?: "",
                    allocatedSlotIds = allocatedSlots
                )
                list.add(r)
            }
        }
        return list
    }

    // Update reservation status in SQLite cache
    fun updateCachedReservationStatus(id: String, status: String) {
        val db = writableDatabase
        val values = ContentValues().apply {
            put(COL_RES_STATUS, status)
        }
        db.update(TABLE_RESERVATIONS, values, "$COL_RES_ID = ?", arrayOf(id))
    }

    // Clear all cached reservations
    fun clearCachedReservations() {
        val db = writableDatabase
        db.delete(TABLE_RESERVATIONS, null, null)
    }
}
