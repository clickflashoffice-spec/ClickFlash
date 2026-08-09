# ClickFlash Photographer for Android

Android-only field application for ClickFlash photographers. It uses an Expo/React Native
application shell with native Android modules, including the Kotlin Nikon camera-tether
adapter under `modules/camera-tether`.

## Requirements

- Windows development workstation with Node.js and pnpm
- Android SDK 36, Android build tools, NDK 27, CMake, and JDK 17
- Android 8.0/API 26 or newer device with USB Host/OTG support
- Data-rated Nikon camera cable and OTG adapter or powered OTG hub

## Development

From the repository root:

```powershell
pnpm install
pnpm --filter mobile run android:prebuild
pnpm --filter mobile run android
```

The app requires a native development build. Expo Go cannot load the `CameraTether`
module.

For an already-installed development APK on the Android emulator, run Metro and the app
in separate terminals:

```powershell
# Terminal 1: forces IPv4 localhost so Windows ADB reverse can reach Metro.
pnpm --filter mobile run start:android

# Terminal 2
adb reverse tcp:8081 tcp:8081
adb shell am start -n com.clickflash.photographer/.MainActivity
```

The Mobile Metro configuration watches only the shared runtime packages declared by this
app. It must not expand the file map to desktop applications or generated Electron build
stages.

## Validation

```powershell
pnpm --filter mobile run typecheck
pnpm --filter mobile run lint
pnpm --filter mobile run test
Push-Location apps/mobile-photographer/android
.\gradlew.bat :camera-tether:testDebugUnitTest
Pop-Location
pnpm --filter mobile run android:apk
```

The Android package identity is `com.clickflash.photographer`. Release builds still require
an organization-controlled signing key, protected CI secret handling, Play/App Distribution
policy, and physical Nikon D7000 qualification.

The debug APK is written to `android/app/build/outputs/apk/debug/app-debug.apk` and includes
the four development/test ABIs. Production distribution should use a signed Android App
Bundle so the store can deliver device-specific ABI splits.

## Background tether lifecycle

After Android grants access to an attached camera, the native tether module starts a
non-exported `connectedDevice` foreground service. Its ongoing notification opens the app,
and a tether-scoped partial wake lock keeps object polling eligible when the display is off.
The service and wake lock stop on cable detach, explicit session stop, connection failure,
or module teardown. Notification permission is requested on Android 13+, but denial does
not crash or block the foreground service.

The service is intentionally `START_NOT_STICKY`: Android must not display a false
“monitoring” state after killing the process. Reopening the app restarts the session, and
the persisted camera baseline plus SQLite ledger reconcile captures made around the
restart. Physical D7000 screen-off, battery, thermal, restart, and reconciliation tests are
still release gates.

## Storage backpressure

The app checks private-storage capacity before entering the import retry loop and checks
again in Kotlin immediately before `MtpDevice.importFile`. It preserves the greater of
512 MiB or 5% of device capacity as free space, capped at 2 GiB. If a capture would cross
that reserve, the ledger records `BLOCKED_STORAGE`, automatic camera retries pause, and the
Studio screen shows free capacity plus the number of waiting camera files.

Tapping `FREE STORAGE + RETRY` opens Android's storage-management screen while space is
still insufficient. Tapping it again after cleanup rechecks capacity and retries queued
objects. A blocked import never deletes the original from the Nikon card. Physical
low-storage, recovery, and card-to-ledger reconciliation tests remain release gates.

## RAW and JPEG companions

Every locally verified JPEG or NEF receives an independent durable pairing record. The
matcher requires the same normalized Nikon filename stem, prefers an equal positive MTP
camera sequence, and otherwise accepts capture timestamps no more than two seconds apart.
This allows RAW and JPEG files on different card storage IDs to remain one capture.

JPEG quick editing starts immediately and never waits for the NEF. A missing companion
changes from `WAITING` to `STANDALONE` after 60 seconds, but a later file can still complete
the pair. Equally strong candidates become `AMBIGUOUS`; the app keeps every original and
requires Master review instead of guessing. The Studio screen reports paired, waiting,
standalone, and ambiguous counts. Physical D7000 RAW+JPEG, burst, two-card, rollover, and
ambiguity tests remain release gates.

## Verified preview and delivery outbox

The Studio screen publishes the checksum-verified camera JPEG before starting the
automatic editor. The untouched original remains visible first, and the quick edit appears
beside it only after the render is copied from Expo cache into app documents, reread,
SHA-256 verified, and persisted as an immutable `QUICK_EDIT` asset.

SQLite stores capture assets, destination intents, and authenticated receipt proofs
separately from import and RAW+JPEG pairing state. Every verified JPEG or NEF currently
creates one required `MASTER` `ORIGINAL` intent in `PENDING`; this is a durable local
outbox, not a claim that the Master received the file. Kiosk and Cloud are supported
destinations in the contract but are not activated until event routing policy and
device-bound authentication exist.

Generic state updates cannot mark an intent `RECEIVED`, `VERIFIED`, or `READY`. Those
states require an authenticated receipt matching the destination, idempotency key, local
SHA-256, and byte count. Master `READY` additionally requires persisted-original,
metadata-commit, and processing-job proof; Kiosk requires indexed/displayable proof; Cloud
requires object-persisted, metadata-commit, and published proof.

## Release signing

Release tasks never fall back to Expo's debug keystore. Keep the organization-controlled
keystore outside the repository and inject these four process-environment values through
the approved CI or workstation secret manager:

- `CLICKFLASH_ANDROID_KEYSTORE_FILE`
- `CLICKFLASH_ANDROID_KEYSTORE_PASSWORD`
- `CLICKFLASH_ANDROID_KEY_ALIAS`
- `CLICKFLASH_ANDROID_KEY_PASSWORD`

Do not save these values in committed Gradle files, shell history, CI logs, or a repository
`.env` file. After secure injection, run `pnpm --filter mobile run android:aab`. If none or
only some values are present, every release task fails closed. The expected output is
`android/app/build/outputs/bundle/release/app-release.aab`; verify its certificate against
the approved upload-key fingerprint before distribution.

The generated `android/` host remains ignored. `app.json`, config plugins, and
`modules/camera-tether` are the source of truth and must reproduce it with
`android:prebuild`.
