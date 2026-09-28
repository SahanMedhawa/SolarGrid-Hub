package com.smartsolar.microgrid.data

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper

/**
 * SQLite Database Helper for pure native Android local persistence.
 * Caches user credentials, session state, and offline reference data.
 */
class DatabaseHelper(context: Context) :
    SQLiteOpenHelper(context, DATABASE_NAME, null, DATABASE_VERSION) {

    companion object {
        private const val DATABASE_NAME = "SmartSolarMicrogrid.db"
        private const val DATABASE_VERSION = 1

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
        const val COL_RES_NODE_ID = "node_id"
        const val COL_RES_DATE = "reservation_date"
        const val COL_RES_KWH = "energy_kwh"
        const val COL_RES_STATUS = "status"
        const val COL_RES_QR = "qr_data"
    }

    // Create the local user and cached reservations tables
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
                $COL_RES_NODE_ID TEXT,
                $COL_RES_DATE TEXT,
                $COL_RES_KWH REAL,
                $COL_RES_STATUS TEXT,
                $COL_RES_QR TEXT
            )
        """.trimIndent()

        db.execSQL(createUserTable)
        db.execSQL(createResTable)
    }

    // Drop and recreate tables on database version upgrade
    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        db.execSQL("DROP TABLE IF EXISTS $TABLE_USER")
        db.execSQL("DROP TABLE IF EXISTS $TABLE_RESERVATIONS")
        onCreate(db)
    }

    // Save or replace active logged-in user in SQLite
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

        db.insert(TABLE_USER, null, values)
    }

    // Clear user session from SQLite
    fun clearUser() {
        val db = writableDatabase
        db.delete(TABLE_USER, null, null)
    }
}
