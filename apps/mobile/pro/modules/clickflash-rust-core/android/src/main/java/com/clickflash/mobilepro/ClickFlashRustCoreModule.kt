package com.clickflash.mobilepro

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ClickFlashRustCoreModule : Module() {
  // Load the Rust JNI library
  init {
    System.loadLibrary("clickflash_rust_core")
  }

  // Declare native JNI methods corresponding to Rust functions
  private external fun queuePhoto(dbPath: String, filePath: String, metadata: String): String
  private external fun enqueueSyncEvent(dbPath: String, eventType: String, endpoint: String, method: String, payload: String, priority: String): String
  private external fun saveBooking(dbPath: String, name: String, whatsapp: String, email: String): String
  private external fun processSpotIntelligence(spotData: String): String
  private external fun getQueueStats(dbPath: String): String
  private external fun syncPendingPhotos(dbPath: String, masterUrl: String): String
  private external fun syncPendingEvents(dbPath: String, targetUrlPrefix: String): String
  private external fun analyzeImage(imagePath: String): String
  private external fun scanAndLinkBeacons(dbPath: String, clickflashUuid: String, durationSecs: Long): String

  override fun definition() = ModuleDefinition {
    // Defines the name of the module that JavaScript will use
    Name("ClickFlashRustCore")

    Events("onGuestUuidDetected")

    // Export queuePhoto to JS
    Function("queuePhoto") { dbPath: String, filePath: String, metadata: String ->
      queuePhoto(dbPath, filePath, metadata)
    }

    // Export enqueueSyncEvent to JS
    Function("enqueueSyncEvent") { dbPath: String, eventType: String, endpoint: String, method: String, payload: String, priority: String ->
      enqueueSyncEvent(dbPath, eventType, endpoint, method, payload, priority)
    }

    // Export saveBooking to JS
    Function("saveBooking") { dbPath: String, name: String, whatsapp: String, email: String ->
      saveBooking(dbPath, name, whatsapp, email)
    }

    // Export processSpotIntelligence to JS
    Function("processSpotIntelligence") { spotData: String ->
      processSpotIntelligence(spotData)
    }

    // Export getQueueStats to JS
    Function("getQueueStats") { dbPath: String ->
      getQueueStats(dbPath)
    }

    // Export syncPendingPhotos to JS
    AsyncFunction("syncPendingPhotos") { dbPath: String, masterUrl: String ->
      syncPendingPhotos(dbPath, masterUrl)
    }

    // Export syncPendingEvents to JS
    AsyncFunction("syncPendingEvents") { dbPath: String, targetUrlPrefix: String ->
      syncPendingEvents(dbPath, targetUrlPrefix)
    }

    // Export analyzeImage to JS
    Function("analyzeImage") { imagePath: String ->
      analyzeImage(imagePath)
    }

    // Export scanAndLinkBeacons to JS
    AsyncFunction("scanAndLinkBeacons") { dbPath: String, clickflashUuid: String, durationSecs: Long ->
      scanAndLinkBeacons(dbPath, clickflashUuid, durationSecs)
    }

    // Stub method for startBleScan emitting onGuestUuidDetected event
    AsyncFunction("startBleScan") { clickflashUuid: String ->
      sendEvent("onGuestUuidDetected", mapOf(
        "guestUuid" to clickflashUuid,
        "rssi" to -50,
        "timestamp" to System.currentTimeMillis()
      ))
      "Started BLE scanning for $clickflashUuid"
    }
  }
}

