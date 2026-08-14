package expo.modules.cameratether

import android.annotation.SuppressLint
import android.app.PendingIntent
import android.content.ActivityNotFoundException
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.usb.UsbConstants
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import android.mtp.MtpConstants
import android.mtp.MtpDevice
import android.mtp.MtpObjectInfo
import android.net.Uri
import android.os.Build
import android.os.StatFs
import android.os.storage.StorageManager
import android.provider.Settings
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.security.MessageDigest
import java.util.Locale

@Suppress("unused")
class CameraTetherModule : Module() {
  private val ioScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
  private val mtpMutex = Mutex()
  private val knownObjects = mutableSetOf<String>()

  private var usbManager: UsbManager? = null
  private var mtpDevice: MtpDevice? = null
  private var currentUsbDevice: UsbDevice? = null
  private var monitorJob: Job? = null
  private var receiversRegistered = false
  private var activeSessionId: String? = null
  private var pollIntervalMs = DEFAULT_POLL_INTERVAL_MS
  private var phase = PHASE_STOPPED
  private var storageSnapshot: CameraStorageSnapshot? = null
  private var lastErrorCode: String? = null
  private var lastErrorMessage: String? = null

  private val permissionReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
      if (intent.action != permissionAction(context)) return

      val device = intent.usbDeviceExtra() ?: return
      val granted = intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)
      if (!granted) {
        currentUsbDevice = device
        CameraTetherForegroundService.stop(context)
        setPhase(
          PHASE_PERMISSION_REQUIRED,
          "USB_PERMISSION_DENIED",
          "Camera access was denied. Reconnect or use Retry Camera."
        )
        sendError(
          "USB_PERMISSION_DENIED",
          "Android did not grant USB access to ${cameraDisplayName(device)}.",
          recoverable = true
        )
        return
      }

      if (activeSessionId != null && isSupportedCamera(device)) {
        beginConnection(device)
      }
    }
  }

  private val deviceReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
      val device = intent.usbDeviceExtra() ?: return

      when (intent.action) {
        UsbManager.ACTION_USB_DEVICE_ATTACHED -> {
          if (activeSessionId != null && isSupportedCamera(device)) {
            beginConnection(device)
          }
        }

        UsbManager.ACTION_USB_DEVICE_DETACHED -> {
          if (device.deviceId == currentUsbDevice?.deviceId) {
            ioScope.launch {
              mtpMutex.withLock {
                closeCameraLocked()
                currentUsbDevice = null
                knownObjects.clear()
              }
              CameraTetherForegroundService.stop(context)
              setPhase(PHASE_WAITING_FOR_CAMERA)
            }
          }
        }
      }
    }
  }

  override fun definition() = ModuleDefinition {
    Name("CameraTether")

    Events(
      EVENT_CAMERA_STATE,
      EVENT_OBJECT_DETECTED,
      EVENT_IMPORT_COMPLETED,
      EVENT_TETHER_ERROR
    )

    OnCreate {
      val context = appContext.reactContext ?: return@OnCreate
      usbManager = context.getSystemService(Context.USB_SERVICE) as? UsbManager
      storageSnapshot = readStorageSnapshot(context, 0L)
      registerReceivers(context)
    }

    OnDestroy {
      val context = appContext.reactContext
      if (context != null) {
        unregisterReceivers(context)
        CameraTetherForegroundService.stop(context)
      }
      ioScope.cancel()
      mtpDevice?.close()
      mtpDevice = null
    }

    Function("getStatus") {
      statusPayload()
    }

    Function("getStorageStatus") { requiredBytes: Double ->
      val context = appContext.reactContext ?: error("React context is unavailable.")
      refreshStorageStatus(
        context,
        requestedByteCount(requiredBytes),
        publish = true
      ).payload()
    }

    Function("openStorageSettings") { requestedBytes: Double ->
      val context = appContext.reactContext ?: error("React context is unavailable.")
      openStorageSettings(context, requestedByteCount(requestedBytes))
    }

    Function("listDevices") {
      listCameraDevices()
    }

    AsyncFunction("startSession") { sessionId: String, requestedPollIntervalMs: Int ->
      require(SESSION_ID_PATTERN.matches(sessionId)) {
        "sessionId must contain 1-64 letters, numbers, periods, underscores, or hyphens"
      }

      if (activeSessionId == sessionId && mtpDevice != null) {
        return@AsyncFunction statusPayload()
      }

      activeSessionId = sessionId
      pollIntervalMs = requestedPollIntervalMs.coerceIn(
        MIN_POLL_INTERVAL_MS,
        MAX_POLL_INTERVAL_MS
      )
      appContext.reactContext?.let { context ->
        storageSnapshot = readStorageSnapshot(context, 0L)
      }
      lastErrorCode = null
      lastErrorMessage = null

      val camera = findPreferredCamera()
      if (camera == null) {
        appContext.reactContext?.let(CameraTetherForegroundService::stop)
        setPhase(PHASE_WAITING_FOR_CAMERA)
      } else {
        beginConnection(camera)
      }

      statusPayload()
    }

    AsyncFunction("stopSession") { promise: Promise ->
      ioScope.launch {
        activeSessionId = null
        monitorJob?.cancel()
        monitorJob = null
        mtpMutex.withLock {
          closeCameraLocked()
          currentUsbDevice = null
          knownObjects.clear()
        }
        appContext.reactContext?.let(CameraTetherForegroundService::stop)
        setPhase(PHASE_STOPPED)
        promise.resolve(statusPayload())
      }
    }

    AsyncFunction("importObject") {
        sessionId: String,
        storageId: Int,
        objectHandle: Int,
        promise: Promise ->
      ioScope.launch {
        try {
          val result = mtpMutex.withLock {
            importObjectLocked(sessionId, storageId, objectHandle)
          }
          sendEvent(EVENT_IMPORT_COMPLETED, result)
          promise.resolve(result)
        } catch (error: StorageBackpressureException) {
          val message = error.message ?: "Camera import paused until phone storage is available."
          promise.reject("ERR_STORAGE_BACKPRESSURE", message, error)
        } catch (error: Exception) {
          val message = error.message ?: "Camera object import failed"
          sendError("CAMERA_IMPORT_FAILED", message, recoverable = true)
          promise.reject("ERR_CAMERA_IMPORT_FAILED", message, error)
        }
      }
    }
  }

  private fun beginConnection(device: UsbDevice) {
    val manager = usbManager
    val context = appContext.reactContext
    if (manager == null || context == null) {
      setPhase(PHASE_UNAVAILABLE, "USB_HOST_UNAVAILABLE", "Android USB Host is unavailable.")
      return
    }

    currentUsbDevice = device
    if (manager.hasPermission(device)) {
      val foregroundStart = CameraTetherForegroundService.start(
        context.applicationContext,
        cameraDisplayName(device)
      )
      if (foregroundStart.isFailure) {
        val error = foregroundStart.exceptionOrNull()
        val message = error?.message
          ?: "Android blocked the camera tether foreground service."
        setPhase(PHASE_ERROR, "FOREGROUND_SERVICE_START_FAILED", message)
        sendError("FOREGROUND_SERVICE_START_FAILED", message, recoverable = true)
        return
      }
      setPhase(PHASE_CONNECTING)
      ioScope.launch { connectAndBaseline(device) }
      return
    }

    setPhase(PHASE_PERMISSION_REQUIRED)
    val flags = PendingIntent.FLAG_UPDATE_CURRENT or
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_MUTABLE else 0
    val permissionIntent = Intent(permissionAction(context)).setPackage(context.packageName)
    val pendingIntent = PendingIntent.getBroadcast(
      context,
      device.deviceId,
      permissionIntent,
      flags
    )
    manager.requestPermission(device, pendingIntent)
  }

  private suspend fun connectAndBaseline(device: UsbDevice) {
    var recoveredObjects = emptyList<CameraObject>()

    try {
      mtpMutex.withLock {
        if (activeSessionId == null) return
        if (device.deviceId == currentUsbDevice?.deviceId && mtpDevice != null) return

        closeCameraLocked()
        currentUsbDevice = device

        val manager = usbManager
          ?: return failConnection(
            "USB_HOST_UNAVAILABLE",
            "Android USB Host is unavailable."
          )
        val connection = manager.openDevice(device)
          ?: return failConnection(
            "CAMERA_OPEN_FAILED",
            "Android could not open the camera USB connection."
          )
        val candidate = MtpDevice(device)
        if (!candidate.open(connection)) {
          connection.close()
          return failConnection(
            "MTP_OPEN_FAILED",
            "The connected camera did not open as a PTP/MTP device."
          )
        }

        mtpDevice = candidate
        setPhase(PHASE_BASELINING)
        val allObjects = scanCaptureObjects(candidate)
        val baselineFile = baselineFile(device, activeSessionId ?: return)
        knownObjects.clear()
        if (baselineFile.exists()) {
          val baselineKeys = runCatching {
            baselineFile.readLines().filterTo(mutableSetOf()) { it.isNotBlank() }
          }.getOrElse { error ->
            sendError(
              "BASELINE_READ_FAILED",
              error.message ?: "The persisted camera baseline could not be read.",
              recoverable = true
            )
            writeBaselineAtomically(baselineFile, allObjects.map { it.key })
            allObjects.mapTo(mutableSetOf()) { it.key }
          }
          recoveredObjects = allObjects.filter { it.key !in baselineKeys }
        } else {
          writeBaselineAtomically(baselineFile, allObjects.map { it.key })
        }
        allObjects.forEach { knownObjects.add(it.key) }
        setPhase(PHASE_MONITORING)
      }
    } catch (error: Exception) {
      mtpMutex.withLock {
        closeCameraLocked()
        knownObjects.clear()
      }
      failConnection(
        "CAMERA_BASELINE_FAILED",
        error.message ?: "The camera baseline could not be initialized."
      )
      return
    }

    recoveredObjects.forEach(::emitObjectDetected)
    startMonitorLoop()
  }

  private fun startMonitorLoop() {
    monitorJob?.cancel()
    monitorJob = ioScope.launch {
      while (isActive && activeSessionId != null) {
        delay(pollIntervalMs.toLong())

        val newObjects = try {
          mtpMutex.withLock {
            val device = mtpDevice ?: return@withLock emptyList()
            scanCaptureObjects(device).filter { knownObjects.add(it.key) }
          }
        } catch (error: Exception) {
          setPhase(
            PHASE_ERROR,
            "CAMERA_SCAN_FAILED",
            error.message ?: "Failed to scan the camera."
          )
          sendError(
            "CAMERA_SCAN_FAILED",
            error.message ?: "Failed to scan the camera.",
            recoverable = true
          )
          emptyList()
        }

        newObjects.forEach(::emitObjectDetected)
      }
    }
  }

  private fun emitObjectDetected(cameraObject: CameraObject) {
    val sessionId = activeSessionId ?: return
    val usbDevice = currentUsbDevice ?: return
    sendEvent(
      EVENT_OBJECT_DETECTED,
      mapOf(
        "sessionId" to sessionId,
        "cameraKey" to cameraKey(usbDevice),
        "deviceId" to usbDevice.deviceId,
        "storageId" to cameraObject.storageId,
        "objectHandle" to cameraObject.handle,
        "objectKey" to cameraObject.key,
        "filename" to cameraObject.info.name,
        "mediaType" to mediaType(cameraObject.info.name),
        "sequenceNumber" to cameraObject.info.sequenceNumberLong,
        "byteSize" to cameraObject.info.compressedSizeLong,
        "cameraCreatedAt" to cameraObject.info.dateCreated,
        "detectedAt" to System.currentTimeMillis()
      )
    )
  }

  private fun scanCaptureObjects(device: MtpDevice): List<CameraObject> {
    val captures = mutableListOf<CameraObject>()
    val visited = mutableSetOf<String>()
    val storageIds = device.storageIds ?: return captures

    storageIds.forEach { storageId ->
      collectCaptureObjects(
        device = device,
        storageId = storageId,
        parentHandle = 0,
        depth = 0,
        visited = visited,
        captures = captures
      )
    }

    return captures
  }

  private fun collectCaptureObjects(
    device: MtpDevice,
    storageId: Int,
    parentHandle: Int,
    depth: Int,
    visited: MutableSet<String>,
    captures: MutableList<CameraObject>
  ) {
    if (depth > MAX_DIRECTORY_DEPTH || visited.size >= MAX_OBJECTS_PER_SCAN) return
    val handles = device.getObjectHandles(storageId, 0, parentHandle) ?: return

    for (handle in handles) {
      if (visited.size >= MAX_OBJECTS_PER_SCAN) return
      val key = "$storageId:$handle"
      if (!visited.add(key)) continue
      val info = device.getObjectInfo(handle) ?: continue

      if (info.format == MtpConstants.FORMAT_ASSOCIATION) {
        collectCaptureObjects(
          device,
          storageId,
          handle,
          depth + 1,
          visited,
          captures
        )
      } else if (isSupportedCapture(info)) {
        captures.add(CameraObject(storageId, handle, info))
      }
    }
  }

  private fun importObjectLocked(
    sessionId: String,
    storageId: Int,
    objectHandle: Int
  ): Map<String, Any> {
    require(activeSessionId == sessionId) { "The requested capture session is not active." }
    val device = mtpDevice ?: error("The camera is not connected.")
    val info = device.getObjectInfo(objectHandle) ?: error("Camera object metadata is unavailable.")
    require(info.storageId == storageId) { "Camera object storage does not match the detected object." }
    require(isSupportedCapture(info)) { "The camera object is not a supported photo format." }

    val context = appContext.reactContext ?: error("React context is unavailable.")
    val sessionDirectory = File(context.filesDir, "camera-imports/$sessionId")
    check(sessionDirectory.mkdirs() || sessionDirectory.isDirectory) {
      "Could not create the private camera import directory."
    }

    val safeName = sanitizeFilename(info.name)
    val finalFile = File(sessionDirectory, "${storageId}_${objectHandle}_$safeName")
    require(finalFile.canonicalPath.startsWith(sessionDirectory.canonicalPath + File.separator)) {
      "Unsafe camera filename."
    }

    if (!finalFile.exists()) {
      val partialFile = File(sessionDirectory, "${finalFile.name}.part")
      if (partialFile.exists()) partialFile.delete()

      val pendingObjectBytes = info.compressedSizeLong.coerceAtLeast(0L)
      val storage = refreshStorageStatus(context, pendingObjectBytes, publish = true)
      if (!storage.canImport) {
        throw StorageBackpressureException(storageMessage(storage))
      }

      try {
        check(device.importFile(objectHandle, partialFile.absolutePath)) {
          "Android MTP import failed."
        }
        check(partialFile.isFile && partialFile.length() > 0L) {
          "Imported camera file is empty."
        }
        if (info.compressedSizeLong > 0L) {
          check(partialFile.length() == info.compressedSizeLong) {
            "Imported camera file size does not match camera metadata."
          }
        }

        FileOutputStream(partialFile, true).use { output -> output.fd.sync() }
        check(partialFile.renameTo(finalFile)) {
          "Could not atomically finalize the imported camera file."
        }
      } catch (error: Exception) {
        partialFile.delete()
        throw error
      }
    } else {
      check(finalFile.isFile && finalFile.length() > 0L) {
        "Existing camera import is empty or invalid."
      }
      if (info.compressedSizeLong > 0L) {
        check(finalFile.length() == info.compressedSizeLong) {
          "Existing camera import size does not match camera metadata."
        }
      }
    }

    val sha256 = sha256(finalFile)
    storageSnapshot = readStorageSnapshot(context, 0L)
    return mapOf(
      "sessionId" to sessionId,
      "cameraKey" to currentUsbDevice?.let(::cameraKey).orEmpty(),
      "deviceId" to (currentUsbDevice?.deviceId ?: -1),
      "storageId" to storageId,
      "objectHandle" to objectHandle,
      "objectKey" to CameraObject(storageId, objectHandle, info).key,
      "filename" to info.name,
      "mediaType" to mediaType(info.name),
      "sequenceNumber" to info.sequenceNumberLong,
      "byteSize" to finalFile.length(),
      "sha256" to sha256,
      "localUri" to Uri.fromFile(finalFile).toString(),
      "importedAt" to System.currentTimeMillis()
    )
  }

  private fun listCameraDevices(): List<Map<String, Any?>> {
    val manager = usbManager ?: return emptyList()
    return manager.deviceList.values
      .filter(::isSupportedCamera)
      .sortedWith(
        compareByDescending<UsbDevice> { it.vendorId == NIKON_VENDOR_ID }
          .thenBy { it.deviceId }
      )
      .map { device ->
        mapOf(
          "deviceId" to device.deviceId,
          "vendorId" to device.vendorId,
          "productId" to device.productId,
          "manufacturerName" to device.manufacturerName,
          "productName" to device.productName,
          "hasPermission" to manager.hasPermission(device),
          "isNikon" to (device.vendorId == NIKON_VENDOR_ID)
        )
      }
  }

  private fun findPreferredCamera(): UsbDevice? {
    return usbManager?.deviceList?.values
      ?.filter(::isSupportedCamera)
      ?.sortedWith(
        compareByDescending<UsbDevice> { it.vendorId == NIKON_VENDOR_ID }
          .thenBy { it.deviceId }
      )
      ?.firstOrNull()
  }

  private fun isSupportedCamera(device: UsbDevice): Boolean {
    if (device.deviceClass == UsbConstants.USB_CLASS_STILL_IMAGE) return true
    return (0 until device.interfaceCount).any { index ->
      device.getInterface(index).interfaceClass == UsbConstants.USB_CLASS_STILL_IMAGE
    }
  }

  private fun isSupportedCapture(info: MtpObjectInfo): Boolean {
    if (info.compressedSizeLong <= 0L) return false
    val extension = info.name.substringAfterLast('.', "").lowercase(Locale.US)
    return extension in SUPPORTED_CAPTURE_EXTENSIONS
  }

  private fun mediaType(filename: String): String {
    return if (filename.endsWith(".nef", ignoreCase = true)) "raw" else "jpeg"
  }

  private fun sanitizeFilename(filename: String): String {
    val leafName = File(filename).name
    val sanitized = leafName.replace(UNSAFE_FILENAME_CHARS, "_").take(MAX_FILENAME_LENGTH)
    return sanitized.ifBlank { "capture.bin" }
  }

  private fun sha256(file: File): String {
    val digest = MessageDigest.getInstance("SHA-256")
    FileInputStream(file).use { input ->
      val buffer = ByteArray(HASH_BUFFER_SIZE)
      while (true) {
        val count = input.read(buffer)
        if (count < 0) break
        if (count > 0) digest.update(buffer, 0, count)
      }
    }
    return digest.digest().joinToString("") { byte -> "%02x".format(byte) }
  }

  private fun statusPayload(): Map<String, Any?> {
    val device = currentUsbDevice
    val storage = storageSnapshot
      ?: appContext.reactContext?.let { context -> readStorageSnapshot(context, 0L) }
      ?: CameraStoragePolicy.evaluate(0L, 0L, 0L)
    storageSnapshot = storage
    return mapOf(
      "isSupported" to true,
      "phase" to phase,
      "sessionId" to activeSessionId,
      "connected" to (mtpDevice != null),
      "deviceId" to device?.deviceId,
      "cameraKey" to device?.let(::cameraKey),
      "vendorId" to device?.vendorId,
      "productId" to device?.productId,
      "manufacturerName" to device?.manufacturerName,
      "productName" to device?.productName,
      "hasPermission" to (device?.let { usbManager?.hasPermission(it) } ?: false),
      "baselineCount" to knownObjects.size,
      "pollIntervalMs" to pollIntervalMs,
      "storage" to storage.payload(),
      "lastErrorCode" to lastErrorCode,
      "lastErrorMessage" to lastErrorMessage
    )
  }

  private fun setPhase(
    nextPhase: String,
    errorCode: String? = null,
    errorMessage: String? = null
  ) {
    phase = nextPhase
    lastErrorCode = errorCode
    lastErrorMessage = errorMessage
    sendEvent(EVENT_CAMERA_STATE, statusPayload())
  }

  private fun sendError(code: String, message: String, recoverable: Boolean) {
    sendEvent(
      EVENT_TETHER_ERROR,
      mapOf(
        "code" to code,
        "message" to message,
        "recoverable" to recoverable,
        "occurredAt" to System.currentTimeMillis()
      )
    )
  }

  private fun refreshStorageStatus(
    context: Context,
    pendingObjectBytes: Long,
    publish: Boolean
  ): CameraStorageSnapshot {
    val snapshot = readStorageSnapshot(context, pendingObjectBytes)
    val wasBlocked = phase == PHASE_STORAGE_BLOCKED
    storageSnapshot = snapshot

    if (!snapshot.canImport && mtpDevice != null) {
      val message = storageMessage(snapshot)
      phase = PHASE_STORAGE_BLOCKED
      lastErrorCode = "STORAGE_BACKPRESSURE"
      lastErrorMessage = message
      if (publish) sendEvent(EVENT_CAMERA_STATE, statusPayload())
      if (!wasBlocked) {
        sendError("STORAGE_BACKPRESSURE", message, recoverable = true)
      }
    } else if (snapshot.canImport && wasBlocked) {
      phase = if (mtpDevice != null) PHASE_MONITORING else PHASE_WAITING_FOR_CAMERA
      lastErrorCode = null
      lastErrorMessage = null
      if (publish) sendEvent(EVENT_CAMERA_STATE, statusPayload())
    } else if (publish) {
      sendEvent(EVENT_CAMERA_STATE, statusPayload())
    }

    return snapshot
  }

  private fun readStorageSnapshot(
    context: Context,
    pendingObjectBytes: Long
  ): CameraStorageSnapshot {
    return runCatching {
      val stats = StatFs(context.filesDir.absolutePath)
      CameraStoragePolicy.evaluate(
        totalBytes = stats.totalBytes,
        availableBytes = stats.availableBytes,
        pendingObjectBytes = pendingObjectBytes
      )
    }.getOrElse {
      CameraStoragePolicy.evaluate(
        totalBytes = 0L,
        availableBytes = 0L,
        pendingObjectBytes = pendingObjectBytes
      )
    }
  }

  private fun storageMessage(snapshot: CameraStorageSnapshot): String {
    val deficitMebibytes = snapshot.deficitBytes / MEBIBYTE_BYTES +
      if (snapshot.deficitBytes % MEBIBYTE_BYTES == 0L) 0L else 1L
    return "Free at least ${deficitMebibytes.coerceAtLeast(1L)} MiB on this phone, " +
      "then retry. The original photo remains safe on the camera card."
  }

  private fun requestedByteCount(value: Double): Long {
    require(value.isFinite() && value >= 0.0 && value <= MAX_SAFE_JAVASCRIPT_INTEGER.toDouble()) {
      "The requested storage byte count must be a non-negative safe integer."
    }
    require(value % 1.0 == 0.0) {
      "The requested storage byte count must be an integer."
    }
    return value.toLong()
  }

  private fun openStorageSettings(context: Context, requestedBytes: Long) {
    val intent = Intent(StorageManager.ACTION_MANAGE_STORAGE).apply {
      val storageManager =
        context.getSystemService(Context.STORAGE_SERVICE) as? StorageManager
      runCatching { storageManager?.getUuidForPath(context.filesDir) }
        .getOrNull()
        ?.let { uuid -> putExtra(StorageManager.EXTRA_UUID, uuid) }
      putExtra(StorageManager.EXTRA_REQUESTED_BYTES, requestedBytes.coerceAtLeast(1L))
    }
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    try {
      context.startActivity(intent)
    } catch (_: ActivityNotFoundException) {
      context.startActivity(
        Intent(Settings.ACTION_INTERNAL_STORAGE_SETTINGS)
          .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      )
    }
  }

  private fun closeCameraLocked() {
    monitorJob?.cancel()
    monitorJob = null
    mtpDevice?.close()
    mtpDevice = null
  }

  private fun failConnection(code: String, message: String) {
    appContext.reactContext?.let(CameraTetherForegroundService::stop)
    setPhase(PHASE_ERROR, code, message)
    sendError(code, message, recoverable = true)
  }

  private fun registerReceivers(context: Context) {
    if (receiversRegistered) return
    registerReceiverCompat(
      context,
      permissionReceiver,
      IntentFilter(permissionAction(context)),
      exported = false
    )
    val deviceFilter = IntentFilter().apply {
      addAction(UsbManager.ACTION_USB_DEVICE_ATTACHED)
      addAction(UsbManager.ACTION_USB_DEVICE_DETACHED)
    }
    registerReceiverCompat(context, deviceReceiver, deviceFilter, exported = true)
    receiversRegistered = true
  }

  private fun unregisterReceivers(context: Context) {
    if (!receiversRegistered) return
    runCatching { context.unregisterReceiver(permissionReceiver) }
    runCatching { context.unregisterReceiver(deviceReceiver) }
    receiversRegistered = false
  }

  @SuppressLint("UnspecifiedRegisterReceiverFlag")
  @Suppress("DEPRECATION")
  private fun registerReceiverCompat(
    context: Context,
    receiver: BroadcastReceiver,
    filter: IntentFilter,
    exported: Boolean
  ) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      context.registerReceiver(
        receiver,
        filter,
        if (exported) Context.RECEIVER_EXPORTED else Context.RECEIVER_NOT_EXPORTED
      )
    } else {
      context.registerReceiver(receiver, filter)
    }
  }

  @Suppress("DEPRECATION")
  private fun Intent.usbDeviceExtra(): UsbDevice? {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      getParcelableExtra(UsbManager.EXTRA_DEVICE, UsbDevice::class.java)
    } else {
      getParcelableExtra(UsbManager.EXTRA_DEVICE)
    }
  }

  private fun permissionAction(context: Context): String {
    return "${context.packageName}.CAMERA_TETHER_USB_PERMISSION"
  }

  private fun cameraDisplayName(device: UsbDevice): String {
    return device.productName ?: device.deviceName
  }

  private fun cameraKey(device: UsbDevice): String {
    val serial = runCatching { device.serialNumber }
      .getOrNull()
      ?.replace(UNSAFE_FILENAME_CHARS, "_")
      ?.take(64)
      ?.ifBlank { null }
      ?: "unknown"
    return "usb-${device.vendorId}-${device.productId}-$serial"
  }

  private fun baselineFile(device: UsbDevice, sessionId: String): File {
    val context = appContext.reactContext ?: error("React context is unavailable.")
    val sessionDirectory = File(context.filesDir, "camera-imports/$sessionId")
    check(sessionDirectory.mkdirs() || sessionDirectory.isDirectory) {
      "Could not create the private camera import directory."
    }
    return File(sessionDirectory, "${cameraKey(device)}.baseline")
  }

  private fun writeBaselineAtomically(file: File, keys: List<String>) {
    val partialFile = File(file.parentFile, "${file.name}.part")
    if (partialFile.exists()) partialFile.delete()
    try {
      FileOutputStream(partialFile).bufferedWriter().use { writer ->
        keys.sorted().forEach { key ->
          writer.write(key)
          writer.newLine()
        }
        writer.flush()
      }
      FileOutputStream(partialFile, true).use { output -> output.fd.sync() }
      if (file.exists()) check(file.delete()) { "Could not replace the camera baseline." }
      check(partialFile.renameTo(file)) { "Could not persist the camera baseline." }
    } catch (error: Exception) {
      partialFile.delete()
      throw error
    }
  }

  private data class CameraObject(
    val storageId: Int,
    val handle: Int,
    val info: MtpObjectInfo
  ) {
    val key = listOf(
      storageId,
      handle,
      info.dateCreated,
      info.compressedSizeLong,
      info.name.replace(UNSAFE_FILENAME_CHARS, "_")
    ).joinToString(":")
  }

  companion object {
    private const val NIKON_VENDOR_ID = 0x04B0
    private const val DEFAULT_POLL_INTERVAL_MS = 750
    private const val MIN_POLL_INTERVAL_MS = 250
    private const val MAX_POLL_INTERVAL_MS = 5_000
    private const val MAX_DIRECTORY_DEPTH = 16
    private const val MAX_OBJECTS_PER_SCAN = 100_000
    private const val MAX_FILENAME_LENGTH = 180
    private const val HASH_BUFFER_SIZE = 1024 * 1024
    private const val MEBIBYTE_BYTES = 1024L * 1024L
    private const val MAX_SAFE_JAVASCRIPT_INTEGER = 9_007_199_254_740_991L

    private const val PHASE_UNAVAILABLE = "UNAVAILABLE"
    private const val PHASE_STOPPED = "STOPPED"
    private const val PHASE_WAITING_FOR_CAMERA = "WAITING_FOR_CAMERA"
    private const val PHASE_PERMISSION_REQUIRED = "PERMISSION_REQUIRED"
    private const val PHASE_CONNECTING = "CONNECTING"
    private const val PHASE_BASELINING = "BASELINING"
    private const val PHASE_MONITORING = "MONITORING"
    private const val PHASE_STORAGE_BLOCKED = "STORAGE_BLOCKED"
    private const val PHASE_ERROR = "ERROR"

    private const val EVENT_CAMERA_STATE = "onCameraState"
    private const val EVENT_OBJECT_DETECTED = "onObjectDetected"
    private const val EVENT_IMPORT_COMPLETED = "onImportCompleted"
    private const val EVENT_TETHER_ERROR = "onTetherError"

    private val SESSION_ID_PATTERN = Regex("^[A-Za-z0-9._-]{1,64}$")
    private val UNSAFE_FILENAME_CHARS = Regex("[^A-Za-z0-9._-]")
    private val SUPPORTED_CAPTURE_EXTENSIONS = setOf("jpg", "jpeg", "nef")
  }
}

private class StorageBackpressureException(message: String) : Exception(message)
