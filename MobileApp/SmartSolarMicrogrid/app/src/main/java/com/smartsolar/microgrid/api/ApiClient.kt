package com.smartsolar.microgrid.api

import android.os.Handler
import android.os.Looper
import android.util.Log
import com.smartsolar.microgrid.utils.Constants
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.ConnectException
import java.net.HttpURLConnection
import java.net.SocketTimeoutException
import java.net.URL
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

/**
 * Pure Kotlin HTTP client using standard HttpURLConnection.
 * Communicates directly with the centralized ASP.NET Core Web API service.
 * Includes complete Logcat diagnostic logging and robust physical-device networking.
 */
object ApiClient {

    private const val TAG = "ApiClient"
    private val executor: ExecutorService = Executors.newFixedThreadPool(4)
    private val mainHandler = Handler(Looper.getMainLooper())

    // Callback interface for API responses
    interface ApiCallback {
        fun onSuccess(response: String)
        fun onError(error: String)
    }

    // Perform an HTTP request on a background thread and deliver result on main thread
    fun request(endpoint: String, method: String, payload: JSONObject?, token: String?, callback: ApiCallback) {
        executor.execute {
            var conn: HttpURLConnection? = null
            val fullUrl = Constants.BASE_URL + endpoint
            Log.d(TAG, "--> $method $fullUrl")
            if (payload != null) {
                Log.d(TAG, "Payload: $payload")
            }

            try {
                val url = URL(fullUrl)
                conn = url.openConnection() as HttpURLConnection
                conn.requestMethod = method
                conn.setRequestProperty("Content-Type", "application/json; charset=utf-8")
                conn.setRequestProperty("Accept", "application/json")

                if (!token.isNullOrEmpty()) {
                    conn.setRequestProperty("Authorization", "Bearer $token")
                }

                conn.connectTimeout = 8000
                conn.readTimeout = 8000

                if (payload != null && (method.equals("POST", ignoreCase = true) || method.equals("PUT", ignoreCase = true))) {
                    conn.doOutput = true
                    conn.outputStream.use { os ->
                        val input = payload.toString().toByteArray(Charsets.UTF_8)
                        os.write(input, 0, input.size)
                    }
                }

                val responseCode = conn.responseCode
                Log.d(TAG, "<-- $responseCode $fullUrl")

                val inputStream = if (responseCode in 200..299) {
                    conn.inputStream
                } else {
                    conn.errorStream
                }

                val response = StringBuilder()
                if (inputStream != null) {
                    BufferedReader(InputStreamReader(inputStream, Charsets.UTF_8)).use { br ->
                        var responseLine: String?
                        while (br.readLine().also { responseLine = it } != null) {
                            response.append(responseLine!!.trim())
                        }
                    }
                }

                val resStr = response.toString()
                Log.d(TAG, "Response: $resStr")

                if (responseCode in 200..299) {
                    mainHandler.post { callback.onSuccess(resStr) }
                } else {
                    var errorMsg = "Error $responseCode"
                    try {
                        val errJson = JSONObject(resStr)
                        if (errJson.has("message")) {
                            errorMsg = errJson.getString("message")
                        }
                    } catch (_: Exception) { }
                    val finalErr = errorMsg
                    Log.w(TAG, "API Returned Error: $finalErr")
                    mainHandler.post { callback.onError(finalErr) }
                }

            } catch (e: ConnectException) {
                val errMsg = "Cannot connect to server at ${Constants.BASE_URL}.\nEnsure PC API is running and device is on the same Wi-Fi (or run 'adb reverse tcp:5000 tcp:5000')."
                Log.e(TAG, "Connection failed to $fullUrl", e)
                mainHandler.post { callback.onError(errMsg) }
            } catch (e: SocketTimeoutException) {
                val errMsg = "Connection to ${Constants.BASE_URL} timed out.\nCheck if Windows Firewall is blocking incoming connections on port 5000."
                Log.e(TAG, "Timeout connecting to $fullUrl", e)
                mainHandler.post { callback.onError(errMsg) }
            } catch (e: Exception) {
                val errMsg = e.message ?: "Network error"
                Log.e(TAG, "Network exception on $fullUrl: $errMsg", e)
                mainHandler.post { callback.onError(errMsg) }
            } finally {
                conn?.disconnect()
            }
        }
    }
}
