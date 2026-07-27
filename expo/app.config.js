module.exports = ({ config: base }) => {
  const isDevVariant = process.env.APP_VARIANT === 'dev';
  const devScheme = 'phyrexianarena-dev';
  const androidIntentFilters = isDevVariant
    ? base.android.intentFilters.map((filter) => ({
        ...filter,
        data: filter.data.map((entry) => entry.scheme === base.scheme ? { ...entry, scheme: devScheme } : entry),
      }))
    : base.android.intentFilters;

  return {
    ...base,
    name: isDevVariant ? 'Phyrexian Arena Dev' : base.name,
    scheme: isDevVariant ? devScheme : base.scheme,
    plugins: [
      ...base.plugins,
      'expo-font',
      'expo-image',
      'expo-splash-screen',
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
  };
};
