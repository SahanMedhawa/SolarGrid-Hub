package com.smartsolar.microgrid.api;

import android.os.Handler;
import android.os.Looper;
import com.smartsolar.microgrid.utils.Constants;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Pure Java HTTP client using standard HttpURLConnection.
 * Communicates directly with the centralized C# Web API FAT service.
 */
public class ApiClient {

    private static final ExecutorService executor = Executors.newFixedThreadPool(4);
    private static final Handler mainHandler = new Handler(Looper.getMainLooper());

    public interface ApiCallback {
        void onSuccess(String response);
        void onError(String error);
    }

    public static void request(String endpoint, String method, JSONObject payload, String token, ApiCallback callback) {
        executor.execute(() -> {
            HttpURLConnection conn = null;
            try {
                URL url = new URL(Constants.BASE_URL + endpoint);
                conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod(method);
                conn.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                conn.setRequestProperty("Accept", "application/json");

                if (token != null && !token.isEmpty()) {
                    conn.setRequestProperty("Authorization", "Bearer " + token);
                }

                conn.setConnectTimeout(10000);
                conn.setReadTimeout(10000);

                if (payload != null && ("POST".equalsIgnoreCase(method) || "PUT".equalsIgnoreCase(method))) {
                    conn.setDoOutput(true);
                    try (OutputStream os = conn.getOutputStream()) {
                        byte[] input = payload.toString().getBytes("utf-8");
                        os.write(input, 0, input.length);
                    }
                }

                int responseCode = conn.getResponseCode();
                InputStream is = (responseCode >= 200 && responseCode < 300) 
                        ? conn.getInputStream() 
                        : conn.getErrorStream();

                StringBuilder response = new StringBuilder();
                if (is != null) {
                    try (BufferedReader br = new BufferedReader(new InputStreamReader(is, "utf-8"))) {
                        String responseLine;
                        while ((responseLine = br.readLine()) != null) {
                            response.append(responseLine.trim());
                        }
                    }
                }

                String resStr = response.toString();
                if (responseCode >= 200 && responseCode < 300) {
                    mainHandler.post(() -> callback.onSuccess(resStr));
                } else {
                    String errorMsg = "Error " + responseCode;
                    try {
                        JSONObject errJson = new JSONObject(resStr);
                        if (errJson.has("message")) {
                            errorMsg = errJson.getString("message");
                        }
                    } catch (Exception ignored) {}
                    String finalErr = errorMsg;
                    mainHandler.post(() -> callback.onError(finalErr));
                }

            } catch (Exception e) {
                mainHandler.post(() -> callback.onError(e.getMessage() != null ? e.getMessage() : "Network error"));
            } finally {
                if (conn != null) {
                    conn.disconnect();
                }
            }
        });
    }
}
