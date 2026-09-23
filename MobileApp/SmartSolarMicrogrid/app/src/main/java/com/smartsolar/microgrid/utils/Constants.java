package com.smartsolar.microgrid.utils;

public class Constants {
    // When testing on Android Emulator, 10.0.2.2 maps to Windows Host localhost
    public static final String BASE_URL = "http://10.0.2.2:5000/api/";
    
    // Preference Keys
    public static final String PREF_NAME = "SmartSolarPrefs";
    public static final String KEY_TOKEN = "jwt_token";
    public static final String KEY_USER_ID = "user_id";
    public static final String KEY_USER_NIC = "user_nic";
    public static final String KEY_USER_ROLE = "user_role";
    public static final String KEY_DISPLAY_NAME = "display_name";
}
