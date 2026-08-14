package expo.modules.masterconnectivity

import android.util.Base64
import com.facebook.react.modules.network.OkHttpClientFactory
import com.facebook.react.modules.network.OkHttpClientProvider
import okhttp3.OkHttpClient
import java.security.MessageDigest
import java.security.cert.X509Certificate
import javax.net.ssl.SSLContext
import javax.net.ssl.TrustManager
import javax.net.ssl.X509TrustManager

object MasterOkHttpFactory : OkHttpClientFactory {
    @Volatile
    var pinnedFingerprint: String? = null

    override fun createNewNetworkModuleClient(): OkHttpClient {
        val builder = OkHttpClientProvider.createClientBuilder()
        
        try {
            val customTrustManager = object : X509TrustManager {
                override fun checkClientTrusted(chain: Array<out X509Certificate>?, authType: String?) {
                    // Client trust check is omitted for OkHttp default
                }

                override fun checkServerTrusted(chain: Array<out X509Certificate>?, authType: String?) {
                    val currentPin = pinnedFingerprint
                    if (currentPin != null && chain != null && chain.isNotEmpty()) {
                        val serverCert = chain[0]
                        val md = MessageDigest.getInstance("SHA-256")
                        val fingerprintBytes = md.digest(serverCert.encoded)
                        val fingerprintBase64 = Base64.encodeToString(fingerprintBytes, Base64.NO_WRAP)
                        
                        if (fingerprintBase64 == currentPin) {
                            return // Trusted based on pinned fingerprint
                        }
                    }
                    
                    // Fall back to default TrustManager if not pinned or pin didn't match
                    val defaultTrustManagerFactory = javax.net.ssl.TrustManagerFactory.getInstance(
                        javax.net.ssl.TrustManagerFactory.getDefaultAlgorithm()
                    )
                    defaultTrustManagerFactory.init(null as java.security.KeyStore?)
                    for (tm in defaultTrustManagerFactory.trustManagers) {
                        if (tm is X509TrustManager) {
                            tm.checkServerTrusted(chain, authType)
                            return
                        }
                    }
                    
                    throw java.security.cert.CertificateException("No X509TrustManager found to validate the certificate")
                }

                override fun getAcceptedIssuers(): Array<X509Certificate> {
                    return emptyArray()
                }
            }

            val sslContext = SSLContext.getInstance("TLS")
            sslContext.init(null, arrayOf<TrustManager>(customTrustManager), java.security.SecureRandom())
            
            builder.sslSocketFactory(sslContext.socketFactory, customTrustManager)
            
            val defaultHostnameVerifier = builder.hostnameVerifier
            builder.hostnameVerifier { hostname, session -> 
                val currentPin = pinnedFingerprint
                if (currentPin != null) {
                    try {
                        val chain = session.peerCertificates
                        if (chain.isNotEmpty() && chain[0] is X509Certificate) {
                            val serverCert = chain[0] as X509Certificate
                            val md = MessageDigest.getInstance("SHA-256")
                            val fingerprintBytes = md.digest(serverCert.encoded)
                            val fingerprintBase64 = Base64.encodeToString(fingerprintBytes, Base64.NO_WRAP)
                            if (fingerprintBase64 == currentPin) {
                                return@hostnameVerifier true
                            }
                        }
                    } catch (e: Exception) {
                        // ignore
                    }
                }
                defaultHostnameVerifier.verify(hostname, session)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }

        return builder.build()
    }
}
