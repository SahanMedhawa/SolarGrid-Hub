package com.smartsolar.microgrid.api

import android.os.Handler
import android.os.Looper
import com.smartsolar.microgrid.utils.Constants
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

/**
 * Pure Kotlin HTTP client using standard HttpURLConnection.
 * Communicates directly with the centralized C# Web API FAT service.
 */
object ApiClient {

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
            try {
                val url = URL(Constants.BASE_URL + endpoint)
                conn = url.openConnection() as HttpURLConnection
                conn.requestMethod = method
                conn.setRequestProperty("Content-Type", "application/json; charset=utf-8")
                conn.setRequestProperty("Accept", "application/json")

                if (!token.isNullOrEmpty()) {
                    conn.setRequestProperty("Authorization", "Bearer $token")
                }

                conn.connectTimeout = 10000
                conn.readTimeout = 10000

                if (payload != null && (method.equals("POST", ignoreCase = true) || method.equals("PUT", ignoreCase = true))) {
                    conn.doOutput = true
                    conn.outputStream.use { os ->
                        val input = payload.toString().toByteArray(Charsets.UTF_8)
                        os.write(input, 0, input.size)
                    }
                }

                val responseCode = conn.responseCode
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
                    mainHandler.post { callback.onError(finalErr) }
                }

            } catch (e: Exception) {
                mainHandler.post { callback.onError(e.message ?: "Network error") }
            } finally {
                conn?.disconnect()
            }
        }
    }
}
