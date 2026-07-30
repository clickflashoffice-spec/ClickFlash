package expo.modules.masterconnectivity

import android.content.Context
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.net.wifi.WifiManager
import android.os.Handler
import android.os.Looper
import android.util.Base64
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.math.BigInteger
import java.nio.charset.StandardCharsets
import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.MessageDigest
import java.security.interfaces.ECPublicKey
import java.security.spec.ECGenParameterSpec
import java.security.spec.ECPoint
import java.security.spec.ECPublicKeySpec
import java.security.KeyFactory
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean
import javax.crypto.KeyAgreement
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

@Suppress("DEPRECATION", "unused")
class MasterConnectivityModule : Module() {
  private val pairingKeys = ConcurrentHashMap<String, KeyPair>()

  override fun definition() = ModuleDefinition {
    Name("MasterConnectivity")

    AsyncFunction("discoverMasters") { timeoutMs: Long, promise: Promise ->
      val context = appContext.reactContext
      if (context == null) {
        promise.reject("CONTEXT_UNAVAILABLE", "Android application context is unavailable.", null)
        return@AsyncFunction
      }
      discoverMasters(context, timeoutMs.coerceIn(500L, 10_000L), promise)
    }

    Function("generatePairingKey") {
      val generator = KeyPairGenerator.getInstance("EC")
      generator.initialize(ECGenParameterSpec("secp256r1"))
      val keyPair = generator.generateKeyPair()
      val keyId = UUID.randomUUID().toString()
      pairingKeys[keyId] = keyPair
      mapOf(
        "keyId" to keyId,
        "publicKey" to Base64.encodeToString(
          MasterConnectivityCrypto.encodeUncompressed(
            keyPair.public as ECPublicKey
          ),
          Base64.NO_WRAP
        )
      )
    }

    Function("derivePairingSecret") {
        keyId: String,
        serverPublicKeyBase64: String,
        salt: String,
        info: String ->
      val keyPair = pairingKeys.remove(keyId)
        ?: throw IllegalStateException("Pairing key is unavailable or has already been consumed.")
      val serverBytes = Base64.decode(serverPublicKeyBase64, Base64.DEFAULT)
      val serverPublicKey = MasterConnectivityCrypto.decodeUncompressed(
        serverBytes,
        keyPair.public as ECPublicKey
      )
      val agreement = KeyAgreement.getInstance("ECDH")
      agreement.init(keyPair.private)
      agreement.doPhase(serverPublicKey, true)
      val sharedSecret = agreement.generateSecret()
      val derived = MasterConnectivityCrypto.hkdfSha256(
        sharedSecret,
        salt.toByteArray(StandardCharsets.UTF_8),
        info.toByteArray(StandardCharsets.UTF_8),
        32
      )
      Base64.encodeToString(derived, Base64.NO_WRAP)
    }

    Function("discardPairingKey") { keyId: String ->
      pairingKeys.remove(keyId)
      Unit
    }

    Function("hmacSha256Base64WithUtf8Key") { key: String, message: String ->
      Base64.encodeToString(
        MasterConnectivityCrypto.hmacSha256(
          key.toByteArray(StandardCharsets.UTF_8),
          message.toByteArray(StandardCharsets.UTF_8)
        ),
        Base64.NO_WRAP
      )
    }

    Function("hmacSha256Base64") { secretBase64: String, message: String ->
      Base64.encodeToString(
        MasterConnectivityCrypto.hmacSha256(
          Base64.decode(secretBase64, Base64.DEFAULT),
          message.toByteArray(StandardCharsets.UTF_8)
        ),
        Base64.NO_WRAP
      )
    }

    Function("verifyHmacSha256Base64") {
        secretBase64: String,
        message: String,
        signatureBase64: String ->
      val expected = MasterConnectivityCrypto.hmacSha256(
        Base64.decode(secretBase64, Base64.DEFAULT),
        message.toByteArray(StandardCharsets.UTF_8)
      )
      val actual = try {
        Base64.decode(signatureBase64, Base64.DEFAULT)
      } catch (_: IllegalArgumentException) {
        ByteArray(0)
      }
      MessageDigest.isEqual(expected, actual)
    }

    Function("verifyHmacSha256Base64WithUtf8Key") {
        key: String,
        message: String,
        signatureBase64: String ->
      val expected = MasterConnectivityCrypto.hmacSha256(
        key.toByteArray(StandardCharsets.UTF_8),
        message.toByteArray(StandardCharsets.UTF_8)
      )
      val actual = try {
        Base64.decode(signatureBase64, Base64.DEFAULT)
      } catch (_: IllegalArgumentException) {
        ByteArray(0)
      }
      MessageDigest.isEqual(expected, actual)
    }

    Function("randomNonce") { byteCount: Int ->
      val bytes = ByteArray(byteCount.coerceIn(16, 64))
      java.security.SecureRandom().nextBytes(bytes)
      Base64.encodeToString(
        bytes,
        Base64.NO_WRAP or Base64.URL_SAFE or Base64.NO_PADDING
      )
    }
  }

  private fun discoverMasters(
    context: Context,
    timeoutMs: Long,
    promise: Promise
  ) {
    val nsdManager = context.getSystemService(Context.NSD_SERVICE) as NsdManager
    val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
    val multicastLock = wifiManager
      ?.createMulticastLock("clickflash-master-discovery")
      ?.apply {
        setReferenceCounted(false)
        acquire()
      }
    val results = ConcurrentHashMap<String, Map<String, Any?>>()
    val completed = AtomicBoolean(false)
    val handler = Handler(Looper.getMainLooper())
    lateinit var listener: NsdManager.DiscoveryListener

    fun finish(errorCode: String? = null, errorMessage: String? = null) {
      if (!completed.compareAndSet(false, true)) return
      try {
        nsdManager.stopServiceDiscovery(listener)
      } catch (_: Exception) {
        // Discovery may already be stopped by Android.
      }
      if (multicastLock?.isHeld == true) multicastLock.release()
      if (errorCode != null) {
        promise.reject(errorCode, errorMessage ?: "Master discovery failed.", null)
      } else {
        promise.resolve(results.values.sortedBy { it["serviceName"] as? String })
      }
    }

    listener = object : NsdManager.DiscoveryListener {
      override fun onDiscoveryStarted(serviceType: String) = Unit

      override fun onServiceFound(serviceInfo: NsdServiceInfo) {
        if (!serviceInfo.serviceName.startsWith("StarMaster", ignoreCase = true)) return
        nsdManager.resolveService(
          serviceInfo,
          object : NsdManager.ResolveListener {
            override fun onResolveFailed(serviceInfo: NsdServiceInfo, errorCode: Int) = Unit

            override fun onServiceResolved(serviceInfo: NsdServiceInfo) {
              val address = serviceInfo.host?.hostAddress ?: return
              val attributes = serviceInfo.attributes.mapValues {
                String(it.value, StandardCharsets.UTF_8)
              }
              if (attributes["mode"] != "master") return
              val urlHost = if (address.contains(":")) "[$address]" else address
              val transport = attributes["transport"]
                ?.takeIf { it == "http" || it == "https" }
                ?: "http"
              val result = mapOf<String, Any?>(
                "serviceName" to serviceInfo.serviceName,
                "host" to address,
                "port" to serviceInfo.port,
                "baseUrl" to "$transport://$urlHost:${serviceInfo.port}",
                "masterId" to attributes["masterId"],
                "protocol" to attributes["captureProtocol"],
                "transport" to transport
              )
              results["$address:${serviceInfo.port}"] = result
            }
          }
        )
      }

      override fun onServiceLost(serviceInfo: NsdServiceInfo) = Unit

      override fun onDiscoveryStopped(serviceType: String) {
        finish()
      }

      override fun onStartDiscoveryFailed(serviceType: String, errorCode: Int) {
        finish(
          "DISCOVERY_START_FAILED",
          "Android NSD could not start discovery (code $errorCode)."
        )
      }

      override fun onStopDiscoveryFailed(serviceType: String, errorCode: Int) {
        finish(
          "DISCOVERY_STOP_FAILED",
          "Android NSD could not stop discovery (code $errorCode)."
        )
      }
    }

    try {
      nsdManager.discoverServices(
        "_http._tcp.",
        NsdManager.PROTOCOL_DNS_SD,
        listener
      )
      handler.postDelayed({ finish() }, timeoutMs)
    } catch (error: Exception) {
      finish("DISCOVERY_FAILED", error.message ?: "Android NSD discovery failed.")
    }
  }
}

internal object MasterConnectivityCrypto {
  fun hmacSha256(key: ByteArray, message: ByteArray): ByteArray {
    val mac = Mac.getInstance("HmacSHA256")
    mac.init(SecretKeySpec(key, "HmacSHA256"))
    return mac.doFinal(message)
  }

  fun hkdfSha256(
    inputKeyMaterial: ByteArray,
    salt: ByteArray,
    info: ByteArray,
    outputLength: Int
  ): ByteArray {
    require(outputLength in 1..(255 * 32))
    val actualSalt = if (salt.isEmpty()) ByteArray(32) else salt
    val pseudoRandomKey = hmacSha256(actualSalt, inputKeyMaterial)
    val output = ByteArray(outputLength)
    var previous = ByteArray(0)
    var outputOffset = 0
    var counter = 1
    while (outputOffset < outputLength) {
      val input = previous + info + byteArrayOf(counter.toByte())
      previous = hmacSha256(pseudoRandomKey, input)
      val copyLength = minOf(previous.size, outputLength - outputOffset)
      previous.copyInto(output, outputOffset, 0, copyLength)
      outputOffset += copyLength
      counter += 1
    }
    return output
  }

  fun encodeUncompressed(publicKey: ECPublicKey): ByteArray {
    return byteArrayOf(4) +
      fixedCoordinate(publicKey.w.affineX) +
      fixedCoordinate(publicKey.w.affineY)
  }

  fun decodeUncompressed(
    encoded: ByteArray,
    parameterSource: ECPublicKey
  ): ECPublicKey {
    require(encoded.size == 65 && encoded[0].toInt() == 4) {
      "Server public key must be an uncompressed P-256 point."
    }
    val x = BigInteger(1, encoded.copyOfRange(1, 33))
    val y = BigInteger(1, encoded.copyOfRange(33, 65))
    val spec = ECPublicKeySpec(ECPoint(x, y), parameterSource.params)
    return KeyFactory.getInstance("EC").generatePublic(spec) as ECPublicKey
  }

  private fun fixedCoordinate(value: BigInteger): ByteArray {
    val raw = value.toByteArray()
    val unsigned = if (raw.size == 33 && raw[0].toInt() == 0) {
      raw.copyOfRange(1, raw.size)
    } else {
      raw
    }
    require(unsigned.size <= 32)
    return ByteArray(32 - unsigned.size) + unsigned
  }
}

