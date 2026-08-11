package expo.modules.cameratether

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class CameraStoragePolicyTest {
  @Test
  fun `allows an import while preserving the capped safety reserve`() {
    val snapshot = CameraStoragePolicy.evaluate(
      totalBytes = 64L * GIBIBYTE,
      availableBytes = 4L * GIBIBYTE,
      pendingObjectBytes = 50L * MEBIBYTE,
      checkedAt = 123L
    )

    assertTrue(snapshot.canImport)
    assertEquals(CameraStorageLevel.OK, snapshot.level)
    assertEquals(2L * GIBIBYTE, snapshot.safetyReserveBytes)
    assertEquals(0L, snapshot.deficitBytes)
    assertEquals(123L, snapshot.checkedAt)
  }

  @Test
  fun `blocks before an object would cross the safety reserve`() {
    val snapshot = CameraStoragePolicy.evaluate(
      totalBytes = 16L * GIBIBYTE,
      availableBytes = 900L * MEBIBYTE,
      pendingObjectBytes = 100L * MEBIBYTE
    )

    assertFalse(snapshot.canImport)
    assertEquals(CameraStorageLevel.BLOCKED, snapshot.level)
    assertTrue(snapshot.deficitBytes > 0L)
  }

  @Test
  fun `warns when capacity is close but the next import remains safe`() {
    val snapshot = CameraStoragePolicy.evaluate(
      totalBytes = 16L * GIBIBYTE,
      availableBytes = 1_500L * MEBIBYTE,
      pendingObjectBytes = 0L
    )

    assertTrue(snapshot.canImport)
    assertEquals(CameraStorageLevel.WARNING, snapshot.level)
  }

  @Test
  fun `saturates required bytes instead of overflowing`() {
    val snapshot = CameraStoragePolicy.evaluate(
      totalBytes = Long.MAX_VALUE,
      availableBytes = Long.MAX_VALUE - 1L,
      pendingObjectBytes = Long.MAX_VALUE
    )

    assertFalse(snapshot.canImport)
    assertEquals(Long.MAX_VALUE, snapshot.requiredAvailableBytes)
    assertEquals(1L, snapshot.deficitBytes)
  }

  private companion object {
    const val MEBIBYTE = 1024L * 1024L
    const val GIBIBYTE = 1024L * MEBIBYTE
  }
}
