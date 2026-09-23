package com.smartsolar.microgrid.data;

import android.content.Context;
import android.content.SharedPreferences;
import com.smartsolar.microgrid.utils.Constants;

/**
 * Manages user authentication session and SharedPreferences.
 */
public class SessionManager {
    private final SharedPreferences pref;
    private final SharedPreferences.Editor editor;
    private final DatabaseHelper dbHelper;

    public SessionManager(Context context) {
        pref = context.getSharedPreferences(Constants.PREF_NAME, Context.MODE_PRIVATE);
        editor = pref.edit();
        dbHelper = new DatabaseHelper(context);
    }

    public void createLoginSession(String token, String userId, String nic, String role, String displayName) {
        editor.putString(Constants.KEY_TOKEN, token);
        editor.putString(Constants.KEY_USER_ID, userId);
        editor.putString(Constants.KEY_USER_NIC, nic);
        editor.putString(Constants.KEY_USER_ROLE, role);
        editor.putString(Constants.KEY_DISPLAY_NAME, displayName);
        editor.commit();

        // Also persist in local SQLite
        dbHelper.saveUser(userId, nic, displayName, role, token);
    }

    public boolean isLoggedIn() {
        return getToken() != null && !getToken().isEmpty();
    }

    public String getToken() {
        return pref.getString(Constants.KEY_TOKEN, null);
    }

    public String getUserNic() {
        return pref.getString(Constants.KEY_USER_NIC, "");
    }

    public String getUserRole() {
        return pref.getString(Constants.KEY_USER_ROLE, "");
    }

    public String getDisplayName() {
        return pref.getString(Constants.KEY_DISPLAY_NAME, "User");
    }

    public void logout() {
        editor.clear();
        editor.commit();
        dbHelper.clearUser();
    }
}
