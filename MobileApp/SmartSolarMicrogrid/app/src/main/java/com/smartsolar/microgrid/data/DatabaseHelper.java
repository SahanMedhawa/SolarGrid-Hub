package com.smartsolar.microgrid.data;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

/**
 * SQLite Database Helper for pure native Android local persistence.
 * Caches user credentials, session state, and offline reference data.
 */
public class DatabaseHelper extends SQLiteOpenHelper {

    private static final String DATABASE_NAME = "SmartSolarMicrogrid.db";
    private static final int DATABASE_VERSION = 1;

    // Table: Local User
    public static final String TABLE_USER = "local_user";
    public static final String COL_USER_ID = "id";
    public static final String COL_USER_NIC = "nic";
    public static final String COL_USER_NAME = "name";
    public static final String COL_USER_ROLE = "role";
    public static final String COL_USER_TOKEN = "token";

    // Table: Cached Reservations
    public static final String TABLE_RESERVATIONS = "cached_reservations";
    public static final String COL_RES_ID = "id";
    public static final String COL_RES_NIC = "prosumer_nic";
    public static final String COL_RES_NODE_ID = "node_id";
    public static final String COL_RES_DATE = "reservation_date";
    public static final String COL_RES_KWH = "energy_kwh";
    public static final String COL_RES_STATUS = "status";
    public static final String COL_RES_QR = "qr_data";

    public DatabaseHelper(Context context) {
        super(context, DATABASE_NAME, null, DATABASE_VERSION);
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        // Create local user table
        String createUserTable = "CREATE TABLE " + TABLE_USER + " ("
                + COL_USER_ID + " TEXT PRIMARY KEY, "
                + COL_USER_NIC + " TEXT, "
                + COL_USER_NAME + " TEXT, "
                + COL_USER_ROLE + " TEXT, "
                + COL_USER_TOKEN + " TEXT);";

        // Create cached reservations table
        String createResTable = "CREATE TABLE " + TABLE_RESERVATIONS + " ("
                + COL_RES_ID + " TEXT PRIMARY KEY, "
                + COL_RES_NIC + " TEXT, "
                + COL_RES_NODE_ID + " TEXT, "
                + COL_RES_DATE + " TEXT, "
                + COL_RES_KWH + " REAL, "
                + COL_RES_STATUS + " TEXT, "
                + COL_RES_QR + " TEXT);";

        db.execSQL(createUserTable);
        db.execSQL(createResTable);
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        db.execSQL("DROP TABLE IF EXISTS " + TABLE_USER);
        db.execSQL("DROP TABLE IF EXISTS " + TABLE_RESERVATIONS);
        onCreate(db);
    }

    // Save or replace active logged-in user in SQLite
    public void saveUser(String id, String nic, String name, String role, String token) {
        SQLiteDatabase db = this.getWritableDatabase();
        db.delete(TABLE_USER, null, null);

        ContentValues values = new ContentValues();
        values.put(COL_USER_ID, id);
        values.put(COL_USER_NIC, nic);
        values.put(COL_USER_NAME, name);
        values.put(COL_USER_ROLE, role);
        values.put(COL_USER_TOKEN, token);

        db.insert(TABLE_USER, null, values);
    }

    // Clear user session from SQLite
    public void clearUser() {
        SQLiteDatabase db = this.getWritableDatabase();
        db.delete(TABLE_USER, null, null);
    }
}
