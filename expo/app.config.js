const base = require('./app.json').expo;

const isDevVariant = process.env.APP_VARIANT === 'dev';
const devScheme = 'phyrexianarena-dev';
const androidIntentFilters = isDevVariant
  ? base.android.intentFilters.map((filter) => ({
      ...filter,
      data: filter.data.map((entry) => entry.scheme === base.scheme ? { ...entry, scheme: devScheme } : entry),
    }))
  : base.android.intentFilters;

module.exports = {
  expo: {
    ...base,
    name: isDevVariant ? 'Phyrexian Arena Dev' : base.name,
    scheme: isDevVariant ? devScheme : base.scheme,
    plugins: [...base.plugins, './plugins/with-clean-intent-filter-markers'],
    android: {
      ...base.android,
      package: isDevVariant ? 'com.phyrexianarena.app.dev' : base.android.package,
      intentFilters: androidIntentFilters,
    },
  },
};
