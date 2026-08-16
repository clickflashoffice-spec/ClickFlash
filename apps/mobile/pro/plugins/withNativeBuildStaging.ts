const { createRunOncePlugin, withProjectBuildGradle } = require('expo/config-plugins');

const PLUGIN_NAME = 'clickflash-native-build-staging';
const BEGIN_MARKER = `// @generated begin ${PLUGIN_NAME}`;
const END_MARKER = `// @generated end ${PLUGIN_NAME}`;
const GENERATED_BLOCK = `${BEGIN_MARKER}
subprojects { subproject ->
  if (subproject.name in [
    "expo-modules-core",
    "react-native-reanimated",
    "react-native-screens",
    "react-native-svg",
    "react-native-worklets"
  ]) {
    subproject.layout.buildDirectory.set(
      rootProject.layout.projectDirectory.dir(".native-build/\${subproject.name}")
    )
    subproject.plugins.withId("com.android.library") {
      subproject.android.externalNativeBuild.cmake.buildStagingDirectory =
        rootProject.file(".cxx/\${subproject.name}")
    }
  }
}
${END_MARKER}`;

function withNativeBuildStaging(config) {
  return withProjectBuildGradle(config, (gradleConfig) => {
    if (gradleConfig.modResults.language !== 'groovy') {
      throw new Error(`${PLUGIN_NAME} requires a Groovy Android project build file.`);
    }

    const markerPattern = new RegExp(
      `\\n?${BEGIN_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${END_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n?`,
      'g'
    );
    const contents = gradleConfig.modResults.contents.replace(markerPattern, '\n').trimEnd();
    gradleConfig.modResults.contents = `${contents}\n${GENERATED_BLOCK}\n`;
    return gradleConfig;
  });
}

module.exports = createRunOncePlugin(withNativeBuildStaging, PLUGIN_NAME, '1.1.0');
