const fs = require('node:fs');
const path = require('node:path');
const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');

module.exports = function withUsbPermissions(config: any) {
  config = withAndroidManifest(config, (manifestConfig: any) => {
    const androidManifest = manifestConfig.modResults.manifest;

    const usesFeature = androidManifest['uses-feature'] || [];
    const hasUsbFeature = usesFeature.some(
      (feature: any) => feature.$['android:name'] === 'android.hardware.usb.host'
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
      (activity: any) =>
        activity['intent-filter'] &&
        activity['intent-filter'].some((filter: any) =>
          filter.action?.some((action: any) => action.$['android:name'] === 'android.intent.action.MAIN')
        )
    );

    if (mainActivity) {
      const intentFilters = mainActivity['intent-filter'] || [];
      const hasUsbIntent = intentFilters.some(
        (filter: any) => filter.action?.some((action: any) => action.$['android:name'] === 'android.hardware.usb.action.USB_DEVICE_ATTACHED')
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
        (item: any) => item.$['android:name'] === 'android.hardware.usb.action.USB_DEVICE_ATTACHED'
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
    async (dangerousConfig: any) => {
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
