# Android Emulator Runtime Evidence

As-of: 2026-08-03. This is a local development smoke on the existing debug APK, not release, physical-device, paired-finance, or production evidence.

## Scope

- AVD: Pixel 8, Android API 35
- Package: `com.clickflash.photographer`, version `1.0.0`
- Route: Android Photographer `Performance`
- Server: local Expo/Metro on port 8081 through ADB reverse

## Diagnosed causes

1. Expo's default monorepo discovery expanded Metro's watch folders across the ClickFlash apps, workers, packages, and generated `apps/moneytrash/build-electron-stage` tree. The Mobile runtime needs only the root module links plus `logger`, `types`, `ui`, and `validation`.
2. On this Windows host, `--localhost` initially bound Metro only to IPv6 `::1`. Android's `adb reverse tcp:8081 tcp:8081` reached IPv4 localhost, and React Native logged `unexpected end of stream on http://localhost:8081` before falling back to a missing embedded bundle.

## Implemented development controls

- `apps/mobile-photographer/metro.config.js` replaces the auto-expanded watch set with the five required runtime roots.
- `pnpm --filter mobile run start:android` starts Expo through Node with `--dns-result-order=ipv4first`, `--dev-client`, and `--localhost`.
- Tests lock both the narrowed watch set and IPv4 Android startup command.

## Reproduction

```powershell
# Terminal 1
pnpm --filter mobile run start:android

# Terminal 2
adb reverse tcp:8081 tcp:8081
adb shell am start -n com.clickflash.photographer/.MainActivity
```

## Observed runtime proof

- Host listener: `127.0.0.1:8081`.
- Metro status: HTTP 200 with `packager-status:running`.
- Android transport: `adb reverse --list` reported `tcp:8081 tcp:8081`.
- React Native log: `isMetroRunning(): Async result = true`.
- React Native log: `loadJSBundleFromMetro()`.
- JavaScript log: `Running "main" with {"rootTag":1,"initialProps":{},"fabric":true}`.
- The live accessibility tree exposed six tabs and successfully activated `Performance`.
- The Performance route rendered `Revenue & Performance`, `Refresh performance data`, Today, Last 7 days, Last 30 days, `PAIRING REQUIRED`, and `Retry performance data`.
- The unpaired state did not fabricate revenue, payout, shift, or zero-value metrics.

## Validation

| Gate | Result |
|---|---:|
| Mobile focused tests | 37/37 pass |
| Mobile TypeScript | Pass |
| Mobile full ESLint | 0 errors, 17 warnings |
| Repository diff check | Pass |

## Limitations and next gates

- The first cold debug bundle took long enough for Android to show an ANR prompt before JavaScript completed. Selecting `Wait` allowed `main` to run and the process remained alive. Cold-start profiling and remediation remain open.
- The device was intentionally unpaired. Authenticated paired data, TND/JPY rendering, loading/fresh/stale/offline/error/denial, and unavailable-field assertions remain `AND-015`.
- TalkBack, large text, contrast, reduced motion, switch access, sunlight/glove, one-hand, and interruption acceptance remain `AND-016`.
- This used the existing debug APK; no clean build, signed AAB, physical Nikon D7000, Play submission, deployment, or customer/pilot action occurred.
