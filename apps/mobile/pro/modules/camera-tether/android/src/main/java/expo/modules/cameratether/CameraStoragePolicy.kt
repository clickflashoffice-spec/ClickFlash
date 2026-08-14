package expo.modules.cameratether

internal enum class CameraStorageLevel {
  OK,
  WARNING,
  BLOCKED
}

internal data class CameraStorageSnapshot(
  val level: CameraStorageLevel,
  val availableBytes: Long,
  val totalBytes: Long,
  val safetyReserveBytes: Long,
  val pendingObjectBytes: Long,
  val requiredAvailableBytes: Long,
  val deficitBytes: Long,
  val canImport: Boolean,
  val checkedAt: Long
) {
  fun payload(): Map<String, Any> {
    return mapOf(
      "level" to level.name,
      "availableBytes" to availableBytes,
      "totalBytes" to totalBytes,
      "safetyReserveBytes" to safetyReserveBytes,
      "pendingObjectBytes" to pendingObjectBytes,
      "requiredAvailableBytes" to requiredAvailableBytes,
      "deficitBytes" to deficitBytes,
      "canImport" to canImport,
      "checkedAt" to checkedAt
    )
  }
}

internal object CameraStoragePolicy {
  internal const val MIN_SAFETY_RESERVE_BYTES = 512L * 1024L * 1024L
  internal const val MAX_SAFETY_RESERVE_BYTES = 2L * 1024L * 1024L * 1024L
  internal const val WARNING_HEADROOM_BYTES = 1L * 1024L * 1024L * 1024L

  fun evaluate(
    totalBytes: Long,
    availableBytes: Long,
    pendingObjectBytes: Long,
    checkedAt: Long = System.currentTimeMillis()
  ): CameraStorageSnapshot {
    val safeTotalBytes = totalBytes.coerceAtLeast(0L)
    val safeAvailableBytes = availableBytes.coerceAtLeast(0L)
    val safePendingObjectBytes = pendingObjectBytes.coerceAtLeast(0L)
    val percentageReserve = safeTotalBytes / 20L
    val safetyReserveBytes = percentageReserve
      .coerceIn(MIN_SAFETY_RESERVE_BYTES, MAX_SAFETY_RESERVE_BYTES)
    val requiredAvailableBytes = saturatingAdd(
      safetyReserveBytes,
      safePendingObjectBytes
    )
    val canImport = safeAvailableBytes >= requiredAvailableBytes
    val warningThreshold = saturatingAdd(
      safetyReserveBytes,
      WARNING_HEADROOM_BYTES
    )
    val level = when {
      !canImport -> CameraStorageLevel.BLOCKED
      safeAvailableBytes < warningThreshold -> CameraStorageLevel.WARNING
      else -> CameraStorageLevel.OK
    }

    return CameraStorageSnapshot(
      level = level,
      availableBytes = safeAvailableBytes,
      totalBytes = safeTotalBytes,
      safetyReserveBytes = safetyReserveBytes,
      pendingObjectBytes = safePendingObjectBytes,
      requiredAvailableBytes = requiredAvailableBytes,
      deficitBytes = (requiredAvailableBytes - safeAvailableBytes).coerceAtLeast(0L),
      canImport = canImport,
      checkedAt = checkedAt
    )
  }

  private fun saturatingAdd(left: Long, right: Long): Long {
    return if (Long.MAX_VALUE - left < right) Long.MAX_VALUE else left + right
  }
}
