const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withCleanIntentFilterMarkers(config) {
  return withAndroidManifest(config, (nextConfig) => {
    const application = nextConfig.modResults.manifest.application?.[0];
    const activities = application?.activity ?? [];
    for (const activity of activities) {
      for (const intentFilter of activity['intent-filter'] ?? []) {
        if (intentFilter.$) delete intentFilter.$['data-generated'];
      }
    }
    return nextConfig;
  });
};
