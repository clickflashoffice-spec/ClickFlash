package expo.modules.cameratether

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager

/**
 * Keeps the process eligible for continuous USB camera monitoring after the
 * photographer backgrounds or locks the phone. Camera ownership remains in
 * [CameraTetherModule]; this service only owns the required user-visible
 * foreground lifecycle.
 */
class CameraTetherForegroundService : Service() {
  private var wakeLock: PowerManager.WakeLock? = null
  private val wakeLockHandler = Handler(Looper.getMainLooper())
  private val renewWakeLock = Runnable { acquireWakeLock() }

  override fun onCreate() {
    super.onCreate()
    val channel = NotificationChannel(
      NOTIFICATION_CHANNEL_ID,
      "Wired camera tether",
      NotificationManager.IMPORTANCE_LOW
    ).apply {
      description = "Shows when ClickFlash is monitoring a connected camera."
      setShowBadge(false)
    }
    getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val cameraName = intent
      ?.getStringExtra(EXTRA_CAMERA_NAME)
      ?.trim()
      ?.take(MAX_CAMERA_NAME_LENGTH)
      ?.ifBlank { null }
      ?: "USB camera"

    startForegroundCompat(buildNotification(cameraName))
    acquireWakeLock()
    return START_NOT_STICKY
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onDestroy() {
    wakeLockHandler.removeCallbacks(renewWakeLock)
    wakeLock?.let { lock ->
      if (lock.isHeld) lock.release()
    }
    wakeLock = null
    super.onDestroy()
  }

  private fun buildNotification(cameraName: String): Notification {
    val launchIntent = packageManager
      .getLaunchIntentForPackage(packageName)
      ?.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
    val contentIntent = launchIntent?.let {
      PendingIntent.getActivity(
        this,
        NOTIFICATION_REQUEST_CODE,
        it,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
    }

    return Notification.Builder(this, NOTIFICATION_CHANNEL_ID)
      .setSmallIcon(R.drawable.clickflash_tether_notification)
      .setContentTitle("ClickFlash camera tether active")
      .setContentText("$cameraName is connected. New photos are monitored automatically.")
      .setCategory(Notification.CATEGORY_SERVICE)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setShowWhen(false)
      .apply {
        if (contentIntent != null) setContentIntent(contentIntent)
      }
      .build()
  }

  private fun startForegroundCompat(notification: Notification) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(
        NOTIFICATION_ID,
        notification,
        ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE
      )
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
  }

  private fun acquireWakeLock() {
    val lock = wakeLock ?: getSystemService(PowerManager::class.java)
      .newWakeLock(
        PowerManager.PARTIAL_WAKE_LOCK,
        "$packageName:CameraTether"
      )
      .apply {
        setReferenceCounted(false)
        wakeLock = this
      }
    if (lock.isHeld) lock.release()
    lock.acquire(WAKE_LOCK_TIMEOUT_MS)
    wakeLockHandler.removeCallbacks(renewWakeLock)
    wakeLockHandler.postDelayed(renewWakeLock, WAKE_LOCK_RENEWAL_MS)
  }

  companion object {
    private const val NOTIFICATION_CHANNEL_ID = "clickflash_camera_tether"
    private const val NOTIFICATION_ID = 7_001
    private const val NOTIFICATION_REQUEST_CODE = 7_001
    private const val EXTRA_CAMERA_NAME = "cameraName"
    private const val MAX_CAMERA_NAME_LENGTH = 80
    private const val WAKE_LOCK_TIMEOUT_MS = 30L * 60L * 1_000L
    private const val WAKE_LOCK_RENEWAL_MS = 25L * 60L * 1_000L

    fun start(context: Context, cameraName: String): Result<Unit> = runCatching {
      val serviceIntent = Intent(context, CameraTetherForegroundService::class.java)
        .putExtra(EXTRA_CAMERA_NAME, cameraName)
      context.startForegroundService(serviceIntent)
    }.map { Unit }

    fun stop(context: Context) {
      context.stopService(Intent(context, CameraTetherForegroundService::class.java))
    }
  }
}
