const fs = require('node:fs');
const path = require('node:path');
const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');

module.exports = function withUsbPermissions(config) {
  config = withAndroidManifest(config, (manifestConfig) => {
    const androidManifest = manifestConfig.modResults.manifest;

    const usesFeature = androidManifest['uses-feature'] || [];
    const hasUsbFeature = usesFeature.some(
      (feature) => feature.$['android:name'] === 'android.hardware.usb.host'
    );

    if (!hasUsbFeature) {
      usesFeature.push({
        $: {
          'android:name': 'android.hardware.usb.host',
          'android:required': 'false',
        },
      });
      androidManifest['uses-feature'] = usesFeature;
    }

    const application = androidManifest.application[0];
    const mainActivity = application.activity.find(
      (activity) =>
        activity['intent-filter'] &&
        activity['intent-filter'].some((filter) =>
          filter.action?.some((action) => action.$['android:name'] === 'android.intent.action.MAIN')
        )
    );

    if (mainActivity) {
      const intentFilters = mainActivity['intent-filter'] || [];
      const hasUsbIntent = intentFilters.some(
        (filter) => filter.action?.some((action) => action.$['android:name'] === 'android.hardware.usb.action.USB_DEVICE_ATTACHED')
      );

      if (!hasUsbIntent) {
        intentFilters.push({
          action: [
            {
              $: {
                'android:name': 'android.hardware.usb.action.USB_DEVICE_ATTACHED',
              },
            },
          ],
        });
        mainActivity['intent-filter'] = intentFilters;
      }

      const metadata = mainActivity['meta-data'] || [];
      const hasUsbFilterMetadata = metadata.some(
        (item) => item.$['android:name'] === 'android.hardware.usb.action.USB_DEVICE_ATTACHED'
      );

      if (!hasUsbFilterMetadata) {
        metadata.push({
          $: {
            'android:name': 'android.hardware.usb.action.USB_DEVICE_ATTACHED',
            'android:resource': '@xml/camera_tether_device_filter',
          },
        });
        mainActivity['meta-data'] = metadata;
      }
    }

    return manifestConfig;
  });

  return withDangerousMod(config, [
    'android',
    async (dangerousConfig) => {
      const xmlDirectory = path.join(
        dangerousConfig.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'res',
        'xml'
      );
      await fs.promises.mkdir(xmlDirectory, { recursive: true });
      await fs.promises.writeFile(
        path.join(xmlDirectory, 'camera_tether_device_filter.xml'),
        [
          '<?xml version="1.0" encoding="utf-8"?>',
          '<resources>',
          '  <usb-device vendor-id="1200" />',
          '  <usb-device class="6" />',
          '</resources>',
          '',
        ].join('\n'),
        'utf8'
      );
      return dangerousConfig;
    },
  ]);
};
