#!/bin/bash
# scripts/boot-emulator.sh

set -e

echo "Looking for available Android Virtual Devices (AVDs)..."

if ! command -v emulator &> /dev/null
then
    echo "Error: 'emulator' command not found in PATH."
    echo "Please ensure Android Studio and the Android SDK are installed, and that \$ANDROID_HOME/emulator is in your PATH."
    exit 1
fi

AVD_NAME=$(emulator -list-avds | head -n 1)

if [ -z "$AVD_NAME" ]; then
    echo "Error: No AVDs found. Please create one in Android Studio."
    exit 1
fi

echo "Found AVD: $AVD_NAME"
echo "Booting $AVD_NAME in headless mode..."

# Start the emulator in the background
emulator -avd "$AVD_NAME" -no-window -no-audio -no-boot-anim &

echo "Waiting for emulator to fully boot..."
adb wait-for-device
adb shell 'while [[ -z $(getprop sys.boot_completed | tr -d '\r') ]]; do sleep 1; done; input keyevent 82'

echo "Emulator is ready!"
