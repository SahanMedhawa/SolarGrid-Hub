package com.smartsolar.microgrid.utils

import android.content.Context
import android.net.wifi.WifiManager
import android.os.Build
import android.util.Log
import java.net.Inet4Address
import java.net.InetSocketAddress
import java.net.NetworkInterface
import java.net.Socket
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Intelligent Server Discovery for developer-ready zero-configuration networking.
 *
 * Automatically detects whether the app is running on:
 * 1. Android Studio Emulator (connecting via 10.0.2.2:5000)
 * 2. Physical device connected via USB or Wi-Fi debugging (connecting via 127.0.0.1:5000 with ADB reverse)
 * 3. Physical device on local Wi-Fi network (discovering host computer on subnet or gateway)
 *
 * Zero configuration required by developers: clone, start server, run app.
 */
object ServerDiscovery {

    private const val TAG = "ServerDiscovery"
    const val SERVER_PORT = 5000
    private const val SOCKET_TIMEOUT_MS = 250

    @Volatile
    private var resolvedHost: String? = null

    // Check if the current device is an Android Emulator
    fun isEmulator(): Boolean {
        return (Build.BRAND.startsWith("generic") && Build.DEVICE.startsWith("generic"))
            || Build.FINGERPRINT.startsWith("generic")
            || Build.FINGERPRINT.startsWith("unknown")
            || Build.HARDWARE.contains("goldfish")
            || Build.HARDWARE.contains("ranchu")
            || Build.MODEL.contains("google_sdk")
            || Build.MODEL.contains("Emulator")
            || Build.MODEL.contains("Android SDK built for x86")
            || Build.MANUFACTURER.contains("Genymotion")
            || Build.PRODUCT.contains("sdk_google")
            || Build.PRODUCT.contains("google_sdk")
            || Build.PRODUCT.contains("sdk")
            || Build.PRODUCT.contains("sdk_x86")
            || Build.PRODUCT.contains("vbox86p")
            || Build.PRODUCT.contains("emulator")
            || Build.PRODUCT.contains("simulator")
    }

    // Check if a specific host:port is reachable via TCP socket
    fun isReachable(host: String, port: Int = SERVER_PORT, timeoutMs: Int = SOCKET_TIMEOUT_MS): Boolean {
        return try {
            Socket().use { socket ->
                socket.connect(InetSocketAddress(host, port), timeoutMs)
                true
            }
        } catch (_: Exception) {
            false
        }
    }

    /**
     * Resolves the server host dynamically.
     * Tries candidates in order:
     * 1. Already resolved host (if verified)
     * 2. Emulator loopback (10.0.2.2) if running on emulator
     * 3. ADB reverse loopback (127.0.0.1) if running on physical device with ADB
     * 4. Wi-Fi Gateway IP
     * 5. Fast parallel scan of local Wi-Fi subnet (/24)
     * 6. Fallback to 10.0.2.2 or 127.0.0.1
     */
    fun resolveServerHost(context: Context? = null, forceRefresh: Boolean = false): String {
        val existing = resolvedHost
        if (!forceRefresh && existing != null && isReachable(existing)) {
            return existing
        }

        Log.i(TAG, "Resolving server host automatically (isEmulator=${isEmulator()})...")

        // 1. Emulator primary
        if (isEmulator()) {
            if (isReachable("10.0.2.2")) {
                Log.i(TAG, "Server discovered on Android Emulator host: 10.0.2.2:$SERVER_PORT")
                resolvedHost = "10.0.2.2"
                return "10.0.2.2"
            }
            if (isReachable("10.0.3.2")) {
                Log.i(TAG, "Server discovered on Genymotion host: 10.0.3.2:$SERVER_PORT")
                resolvedHost = "10.0.3.2"
                return "10.0.3.2"
            }
        }

        // 2. Physical device with ADB reverse (or emulator loopback)
        if (isReachable("127.0.0.1")) {
            Log.i(TAG, "Server discovered via loopback: 127.0.0.1:$SERVER_PORT")
            resolvedHost = "127.0.0.1"
            return "127.0.0.1"
        }

        // 3. Wi-Fi Gateway IP
        val gatewayIp = getGatewayIp(context)
        if (!gatewayIp.isNullOrEmpty() && isReachable(gatewayIp)) {
            Log.i(TAG, "Server discovered on Wi-Fi Gateway: $gatewayIp:$SERVER_PORT")
            resolvedHost = gatewayIp
            return gatewayIp
        }

        // 4. Scan local Wi-Fi subnet (/24) in parallel
        val subnetHost = scanSubnetForServer()
        if (subnetHost != null) {
            Log.i(TAG, "Server discovered on local Wi-Fi subnet: $subnetHost:$SERVER_PORT")
            resolvedHost = subnetHost
            return subnetHost
        }

        // 5. Final fallback
        val defaultFallback = if (isEmulator()) "10.0.2.2" else "127.0.0.1"
        Log.w(TAG, "Server discovery completed without active response. Using fallback: $defaultFallback")
        resolvedHost = defaultFallback
        return defaultFallback
    }

    // Determine the device's default gateway IP if connected to Wi-Fi
    private fun getGatewayIp(context: Context?): String? {
        if (context == null) return null
        return try {
            val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
            val dhcp = wifiManager?.dhcpInfo ?: return null
            val gateway = dhcp.gateway
            if (gateway != 0) {
                String.format(
                    "%d.%d.%d.%d",
                    gateway and 0xff,
                    gateway shr 8 and 0xff,
                    gateway shr 16 and 0xff,
                    gateway shr 24 and 0xff
                )
            } else null
        } catch (_: Exception) {
            null
        }
    }

    // Get the device's local IPv4 on the active network interface
    private fun getDeviceIp(): String? {
        try {
            val interfaces = NetworkInterface.getNetworkInterfaces() ?: return null
            for (intf in interfaces) {
                val addrs = intf.inetAddresses
                for (addr in addrs) {
                    if (!addr.isLoopbackAddress && addr is Inet4Address) {
                        val host = addr.hostAddress ?: continue
                        if (!host.startsWith("127.")) {
                            return host
                        }
                    }
                }
            }
        } catch (_: Exception) { }
        return null
    }

    // Parallel scan of the local /24 subnet for the running ASP.NET Core server
    private fun scanSubnetForServer(): String? {
        val deviceIp = getDeviceIp() ?: return null
        val lastDot = deviceIp.lastIndexOf('.')
        if (lastDot <= 0) return null
        val prefix = deviceIp.substring(0, lastDot + 1)
        val myLastOctet = deviceIp.substring(lastDot + 1).toIntOrNull() ?: -1

        val foundHost = AtomicBoolean(false)
        val result = ConcurrentLinkedQueue<String>()
        val threadPool = Executors.newFixedThreadPool(32)

        try {
            for (i in 1..254) {
                if (i == myLastOctet) continue
                val candidateIp = "$prefix$i"
                threadPool.execute {
                    if (foundHost.get()) return@execute
                    if (isReachable(candidateIp, SERVER_PORT, 200)) {
                        if (foundHost.compareAndSet(false, true)) {
                            result.add(candidateIp)
                        }
                    }
                }
            }
            threadPool.shutdown()
            threadPool.awaitTermination(1500, TimeUnit.MILLISECONDS)
        } catch (_: Exception) {
        } finally {
            threadPool.shutdownNow()
        }

        return result.peek()
    }
}
