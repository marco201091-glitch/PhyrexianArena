module.exports = ({ config: base }) => {
  const isDevVariant = process.env.APP_VARIANT === 'dev';
  const devScheme = 'phyrexianarena-dev';
  const productionHost = 'app.phyrexianarena.dpdns.org';
  const devHost = 'dev.phyrexianarena.dpdns.org';
  const androidIntentFilters = isDevVariant
    ? base.android.intentFilters.map((filter) => ({
        ...filter,
        data: filter.data.map((entry) => {
          if (entry.scheme === base.scheme) return { ...entry, scheme: devScheme };
          if (entry.host === productionHost) return { ...entry, host: devHost };
          return entry;
        }),
      }))
    : base.android.intentFilters;
  const iosAssociatedDomains = isDevVariant
    ? base.ios.associatedDomains.map((domain) => domain === `applinks:${productionHost}` ? `applinks:${devHost}` : domain)
    : base.ios.associatedDomains;

  return {
    ...base,
    name: isDevVariant ? 'Phyrexian Arena Dev' : base.name,
    scheme: isDevVariant ? devScheme : base.scheme,
    plugins: [
      ...base.plugins,
      'expo-font',
      'expo-image',
      ['expo-splash-screen', {
        image: './assets/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: '#0a0a0f',
      }],
      'expo-status-bar',
      'expo-web-browser',
      ['@sentry/react-native/expo', {
        organization: process.env.SENTRY_ORG,
        project: process.env.SENTRY_MOBILE_PROJECT || process.env.SENTRY_PROJECT,
        url: process.env.SENTRY_URL,
        disableAutoUpload: isDevVariant,
      }],
      './plugins/with-clean-intent-filter-markers',
    ],
    android: {
      ...base.android,
      package: isDevVariant ? 'com.phyrexianarena.app.dev' : base.android.package,
      intentFilters: androidIntentFilters,
    },
    ios: {
      ...base.ios,
      bundleIdentifier: isDevVariant ? 'com.phyrexianarena.app.dev' : base.ios.bundleIdentifier,
      associatedDomains: iosAssociatedDomains,
    },
  };
};
