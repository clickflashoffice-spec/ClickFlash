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

## Validation

```powershell
pnpm --filter mobile run typecheck
pnpm --filter mobile run lint
pnpm --filter mobile run android:apk
```

The Android package identity is `com.clickflash.photographer`. Release builds still require
an organization-controlled signing key, protected CI secret handling, Play/App Distribution
policy, and physical Nikon D7000 qualification.

The debug APK is written to `android/app/build/outputs/apk/debug/app-debug.apk` and includes
the four development/test ABIs. Production distribution should use a signed Android App
Bundle so the store can deliver device-specific ABI splits.

The generated `android/` host remains ignored. `app.json`, config plugins, and
`modules/camera-tether` are the source of truth and must reproduce it with
`android:prebuild`.
