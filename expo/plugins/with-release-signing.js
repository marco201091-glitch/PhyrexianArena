const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = '// phyrexian-release-signing';

function injectReleaseSigning(contents) {
  if (contents.includes(MARKER)) return contents;

  const signingNeedle = `    signingConfigs {
        debug {`;
  if (!contents.includes(signingNeedle)) {
    throw new Error('Unable to locate Android signingConfigs block');
  }

  const releaseSigning = `    signingConfigs {
        release {
            ${MARKER}
            def signingPropertiesPath = System.getenv("PHYREXIAN_SIGNING_PROPERTIES")
            if (!signingPropertiesPath) {
                throw new GradleException("PHYREXIAN_SIGNING_PROPERTIES is required for a production release")
            }
            def signingPropertiesFile = file(signingPropertiesPath)
            if (!signingPropertiesFile.exists()) {
                throw new GradleException("Android signing properties file not found")
            }
            def signingProperties = new Properties()
            signingPropertiesFile.withInputStream { signingProperties.load(it) }
            storeFile file(signingProperties["storeFile"])
            storePassword signingProperties["storePassword"]
            keyAlias signingProperties["keyAlias"]
            keyPassword signingProperties["keyPassword"]
        }
        debug {`;

  let next = contents.replace(signingNeedle, releaseSigning);
  const debugSigning = 'signingConfig signingConfigs.debug';
  const debugBuildSigningIndex = next.indexOf(debugSigning);
  const releaseBuildSigningIndex = next.indexOf(
    debugSigning,
    debugBuildSigningIndex + debugSigning.length,
  );
  if (debugBuildSigningIndex < 0 || releaseBuildSigningIndex < 0) {
    throw new Error('Unable to locate Android release signing configuration');
  }
  next = `${next.slice(0, releaseBuildSigningIndex)}signingConfig signingConfigs.release${next.slice(releaseBuildSigningIndex + debugSigning.length)}`;
  return next;
}

module.exports = function withReleaseSigning(config) {
  if (process.env.APP_VARIANT !== 'production') return config;
  return withAppBuildGradle(config, (gradleConfig) => {
    if (gradleConfig.modResults.language !== 'groovy') {
      throw new Error('Production signing plugin requires Groovy build.gradle');
    }
    gradleConfig.modResults.contents = injectReleaseSigning(
      gradleConfig.modResults.contents,
    );
    return gradleConfig;
  });
};

module.exports.injectReleaseSigning = injectReleaseSigning;
