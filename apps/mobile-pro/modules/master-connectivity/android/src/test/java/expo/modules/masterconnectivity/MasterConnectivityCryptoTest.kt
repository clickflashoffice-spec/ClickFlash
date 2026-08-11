package expo.modules.masterconnectivity

import org.junit.Assert.assertEquals
import org.junit.Test

class MasterConnectivityCryptoTest {
  @Test
  fun hkdfMatchesRfc5869CaseOne() {
    val input = ByteArray(22) { 0x0b }
    val salt = hex("000102030405060708090a0b0c")
    val info = hex("f0f1f2f3f4f5f6f7f8f9")
    val output = MasterConnectivityCrypto.hkdfSha256(input, salt, info, 42)

    assertEquals(
      "3cb25f25faacd57a90434f64d0362f2a" +
        "2d2d0a90cf1a5a4c5db02d56ecc4c5bf" +
        "34007208d5b887185865",
      output.joinToString("") { "%02x".format(it) }
    )
  }

  @Test
  fun hkdfMatchesCommandCenterNodeVectorWithEmptySalt() {
    val input = ByteArray(32) { it.toByte() }
    val info = (
      "CF-AEAD-HKDF-SHA256-V1\n" +
        "COMMAND_CENTER_RESPONSE\n" +
        "MASTER_TO_MOBILE\n" +
        "master-test\n" +
        "android-test\n" +
        "1770000000000\n" +
        "1770000000001\n" +
        "abcdefghijklmnop"
      ).toByteArray(Charsets.UTF_8)

    val output = MasterConnectivityCrypto.hkdfSha256(
      input,
      ByteArray(0),
      info,
      32
    )

    assertEquals(
      "4fff33790f5f458c8593f3b05244b25c" +
        "4fe2ad50e812315e09bcd32a68c901c2",
      output.joinToString("") { "%02x".format(it) }
    )
  }

  private fun hex(value: String): ByteArray {
    return value.chunked(2).map { it.toInt(16).toByte() }.toByteArray()
  }
}
