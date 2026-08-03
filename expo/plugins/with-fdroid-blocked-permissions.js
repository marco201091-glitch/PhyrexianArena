const { withAndroidManifest } = require('@expo/config-plugins');

const BLOCKED_PERMISSIONS = new Set([
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
]);

module.exports = function withFdroidBlockedPermissions(config) {
  if (process.env.APP_VARIANT !== 'fdroid' && process.env.EXPO_PUBLIC_FDROID_BUILD !== 'true') {
    return config;
  }

  return withAndroidManifest(config, (nextConfig) => {
    const manifest = nextConfig.modResults.manifest;
    const permissions = manifest['uses-permission'] ?? [];
    const retained = permissions.filter(
      (permission) => !BLOCKED_PERMISSIONS.has(permission.$?.['android:name']),
    );

    manifest['uses-permission'] = [
      ...retained,
      ...[...BLOCKED_PERMISSIONS].map((name) => ({
        $: {
          'android:name': name,
          'tools:node': 'remove',
        },
      })),
    ];
    return nextConfig;
  });
};
