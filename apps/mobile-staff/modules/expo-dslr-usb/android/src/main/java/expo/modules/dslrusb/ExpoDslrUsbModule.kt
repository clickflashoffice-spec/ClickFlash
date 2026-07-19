package expo.modules.dslrusb

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import android.mtp.MtpDevice
import android.mtp.MtpObjectInfo
import android.os.Build
import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.io.File
import java.io.FileOutputStream

class ExpoDslrUsbModule : Module() {
  private val ACTION_USB_PERMISSION = "com.clickflash.mobile.USB_PERMISSION"
  private var mtpDevice: MtpDevice? = null
  private var usbManager: UsbManager? = null

  override fun definition() = ModuleDefinition {
    Name("ExpoDslrUsb")

    Events("onDeviceConnected", "onDeviceDisconnected", "onPhotoReceived")

    OnCreate {
      usbManager = appContext.reactContext?.getSystemService(Context.USB_SERVICE) as UsbManager?
    }

    AsyncFunction("connect") { promise: expo.modules.kotlin.Promise ->
      val context = appContext.reactContext ?: return@AsyncFunction promise.reject("ERR_NO_CONTEXT", "React context is missing", null)
      val deviceList = usbManager?.deviceList ?: emptyMap()
      
      val cameraDevice = deviceList.values.firstOrNull { device -> 
        // 6 is USB_CLASS_STILL_IMAGE (PTP/MTP)
        device.deviceClass == 6 || (0 until device.interfaceCount).any { device.getInterface(it).interfaceClass == 6 }
      }

      if (cameraDevice == null) {
        return@AsyncFunction promise.reject("ERR_NO_DEVICE", "No camera detected via USB OTG", null)
      }

      if (usbManager?.hasPermission(cameraDevice) == true) {
        openDevice(cameraDevice)
        promise.resolve(true)
      } else {
        val permissionIntent = PendingIntent.getBroadcast(
          context, 0, Intent(ACTION_USB_PERMISSION),
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_MUTABLE else 0
        )
        usbManager?.requestPermission(cameraDevice, permissionIntent)
        promise.resolve(false) // Needs permission
      }
    }

    AsyncFunction("disconnect") {
      mtpDevice?.close()
      mtpDevice = null
    }

    AsyncFunction("pollPhotos") { promise: expo.modules.kotlin.Promise ->
      val device = mtpDevice ?: return@AsyncFunction promise.reject("ERR_NOT_CONNECTED", "MTP device is not connected", null)
      
      CoroutineScope(Dispatchers.IO).launch {
        try {
          val storageIds = device.storageIds
          if (storageIds == null || storageIds.isEmpty()) {
            promise.reject("ERR_NO_STORAGE", "No storage found on camera", null)
            return@launch
          }
          
          val storageId = storageIds[0]
          val objectHandles = device.getObjectHandles(storageId, 0, 0)
          
          if (objectHandles == null || objectHandles.isEmpty()) {
            promise.resolve(emptyList<String>())
            return@launch
          }

          // Fetch the latest photo (simplistic approach for architecture demo)
          val latestHandle = objectHandles.last()
          val objectInfo = device.getObjectInfo(latestHandle)
          if (objectInfo == null) {
            promise.reject("ERR_NO_OBJECT_INFO", "Could not retrieve object info from camera", null)
            return@launch
          }
          
          // Download it to local cache
          val cacheDir = appContext.reactContext?.cacheDir
          val outFile = File(cacheDir, objectInfo.name)
          
          if (!outFile.exists()) {
            val bytes = device.getObject(latestHandle, objectInfo.compressedSize)
            val fos = FileOutputStream(outFile)
            fos.write(bytes)
            fos.close()
            
            // Emit event
            sendEvent("onPhotoReceived", mapOf("uri" to "file://${outFile.absolutePath}"))
          }
          
          promise.resolve(listOf("file://${outFile.absolutePath}"))
        } catch (e: Exception) {
          promise.reject("ERR_POLL_FAILED", e.message, e)
        }
      }
    }
  }

  private fun openDevice(device: UsbDevice) {
    val connection = usbManager?.openDevice(device)
    if (connection != null) {
      mtpDevice = MtpDevice(device)
      if (mtpDevice?.open(connection) == true) {
        sendEvent("onDeviceConnected", mapOf("name" to device.productName))
      }
    }
  }
}
