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
 * Includes intelligent auto-discovery retry for zero-configuration developer experience.
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
            executeInternal(endpoint, method, payload, token, callback, allowRetry = true)
        }
    }

    private fun executeInternal(
        endpoint: String,
        method: String,
        payload: JSONObject?,
        token: String?,
        callback: ApiCallback,
        allowRetry: Boolean
    ) {
        // Ensure base URL has been resolved
        Constants.ensureBaseUrl()

        var conn: HttpURLConnection? = null
        val fullUrl = Constants.BASE_URL + endpoint
        Log.d(TAG, "--> $method $fullUrl")
        if (payload != null) {
            Log.d(TAG, "Payload: $payload")
        }

        try {
            val url = URL(fullUrl)
            conn = url.openConnection() as HttpURLConnection

            // HttpURLConnection does not support PATCH natively (Java/Android platform
            // limitation - only GET, POST, PUT, DELETE, HEAD, OPTIONS, TRACE are allowed).
            // Workaround: set method to POST, then override the internal "method" field
            // via reflection so the actual HTTP request line sent over the wire is PATCH.
            if (method.equals("PATCH", ignoreCase = true)) {
                conn.requestMethod = "POST"
                try {
                    val methodField = conn.javaClass.superclass.getDeclaredField("method")
                    methodField.isAccessible = true
                    methodField.set(conn, "PATCH")
                } catch (e: Exception) {
                    Log.w(TAG, "PATCH override failed, falling back to POST: ${e.message}")
                }
            } else {
                conn.requestMethod = method
            }

            conn.setRequestProperty("Content-Type", "application/json; charset=utf-8")
            conn.setRequestProperty("Accept", "application/json")

            if (!token.isNullOrEmpty()) {
                conn.setRequestProperty("Authorization", "Bearer $token")
            }

            conn.connectTimeout = 6000
            conn.readTimeout = 8000

            if (payload != null && (method.equals("POST", ignoreCase = true) || method.equals("PUT", ignoreCase = true) || method.equals("PATCH", ignoreCase = true))) {
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

        } catch (e: Exception) {
            val isNetworkIssue = e is ConnectException || e is SocketTimeoutException
            if (allowRetry && isNetworkIssue) {
                Log.w(TAG, "Connection failed to $fullUrl. Auto-rediscovering server...")
                Constants.refreshBaseUrl()
                val newUrl = Constants.BASE_URL + endpoint
                Log.i(TAG, "Retrying request once via rediscovery: $newUrl")
                executeInternal(endpoint, method, payload, token, callback, allowRetry = false)
                return
            }

            val errMsg = when (e) {
                is ConnectException -> "Cannot connect to server at ${Constants.BASE_URL}.\nEnsure API server is running ('dotnet run')."
                is SocketTimeoutException -> "Connection to server timed out.\nEnsure device and PC are on the same network or ADB is connected."
                else -> e.message ?: "Network error"
            }
            Log.e(TAG, "Request error on $fullUrl: $errMsg", e)
            mainHandler.post { callback.onError(errMsg) }
        } finally {
            conn?.disconnect()
        }
    }
}