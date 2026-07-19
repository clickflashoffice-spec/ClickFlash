const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withUsbPermissions(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults.manifest;

    // Ensure uses-feature for usb host exists
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

    // Ensure uses-permission for USB exists
    const usesPermission = androidManifest['uses-permission'] || [];
    if (!usesPermission.some(p => p.$['android:name'] === 'android.permission.USB_PERMISSION')) {
        usesPermission.push({
            $: { 'android:name': 'android.permission.USB_PERMISSION' }
        });
        androidManifest['uses-permission'] = usesPermission;
    }

    // Add intent filter to the main activity
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
          action: [{ $: { 'android:name': 'android.hardware.usb.action.USB_DEVICE_ATTACHED' } }],
          'meta-data': [{ $: { 'android:name': 'android.hardware.usb.action.USB_DEVICE_ATTACHED', 'android:resource': '@xml/device_filter' } }]
        });
        mainActivity['intent-filter'] = intentFilters;
      }
    }

    return config;
  });
};
