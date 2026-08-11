const { createRunOncePlugin, withAppBuildGradle } = require('expo/config-plugins');

const PLUGIN_NAME = 'clickflash-android-release-signing';
const ENV_BEGIN_MARKER = `// @generated begin ${PLUGIN_NAME}-environment`;
const ENV_END_MARKER = `// @generated end ${PLUGIN_NAME}-environment`;
const SIGNING_BEGIN_MARKER = `// @generated begin ${PLUGIN_NAME}-config`;
const SIGNING_END_MARKER = `// @generated end ${PLUGIN_NAME}-config`;
const ASSIGNMENT_BEGIN_MARKER = `// @generated begin ${PLUGIN_NAME}-assignment`;
const ASSIGNMENT_END_MARKER = `// @generated end ${PLUGIN_NAME}-assignment`;

const ENVIRONMENT_BLOCK = `${ENV_BEGIN_MARKER}
def clickFlashReleaseSigningVariableNames = [
    "CLICKFLASH_ANDROID_KEYSTORE_FILE",
    "CLICKFLASH_ANDROID_KEYSTORE_PASSWORD",
    "CLICKFLASH_ANDROID_KEY_ALIAS",
    "CLICKFLASH_ANDROID_KEY_PASSWORD",
]
def clickFlashReleaseSigningValues = clickFlashReleaseSigningVariableNames.collectEntries { name ->
    [(name): System.getenv(name)]
}
def clickFlashReleaseSigningProvided = clickFlashReleaseSigningValues.values().findAll { value ->
    value != null && !value.isEmpty()
}
def clickFlashReleaseSigningConfigured =
    clickFlashReleaseSigningProvided.size() == clickFlashReleaseSigningVariableNames.size()

if (!clickFlashReleaseSigningProvided.isEmpty() && !clickFlashReleaseSigningConfigured) {
    throw new GradleException(
        "Incomplete ClickFlash Android release signing environment. " +
        "Provide all required CLICKFLASH_ANDROID_* variables or none of them."
    )
}

if (clickFlashReleaseSigningConfigured &&
    !file(clickFlashReleaseSigningValues["CLICKFLASH_ANDROID_KEYSTORE_FILE"]).isFile()) {
    throw new GradleException("ClickFlash Android release keystore file does not exist.")
}

gradle.taskGraph.whenReady { graph ->
    def clickFlashReleaseTaskRequested = graph.allTasks.any { task ->
        task.project == project && task.name.toLowerCase().contains("release")
    }
    if (clickFlashReleaseTaskRequested && !clickFlashReleaseSigningConfigured) {
        throw new GradleException(
            "ClickFlash Android release tasks require organization-controlled signing. " +
            "Debug signing is intentionally forbidden for release artifacts."
        )
    }
}
${ENV_END_MARKER}`;

const SIGNING_CONFIG_BLOCK = `        ${SIGNING_BEGIN_MARKER}
        release {
            if (clickFlashReleaseSigningConfigured) {
                storeFile file(clickFlashReleaseSigningValues["CLICKFLASH_ANDROID_KEYSTORE_FILE"])
                storePassword clickFlashReleaseSigningValues["CLICKFLASH_ANDROID_KEYSTORE_PASSWORD"]
                keyAlias clickFlashReleaseSigningValues["CLICKFLASH_ANDROID_KEY_ALIAS"]
                keyPassword clickFlashReleaseSigningValues["CLICKFLASH_ANDROID_KEY_PASSWORD"]
            }
        }
        ${SIGNING_END_MARKER}`;

const RELEASE_ASSIGNMENT_BLOCK = `            ${ASSIGNMENT_BEGIN_MARKER}
            if (clickFlashReleaseSigningConfigured) {
                signingConfig signingConfigs.release
            }
            ${ASSIGNMENT_END_MARKER}`;

function replaceMarkedBlock(contents, beginMarker, endMarker, block) {
  const beginIndex = contents.indexOf(beginMarker);
  const endIndex = contents.indexOf(endMarker);

  if (beginIndex === -1 && endIndex === -1) {
    return null;
  }
  if (beginIndex === -1 || endIndex === -1 || endIndex < beginIndex) {
    throw new Error(`${PLUGIN_NAME} found incomplete generated markers.`);
  }

  const lineStart = contents.lastIndexOf('\n', beginIndex) + 1;
  const lineEnd = contents.indexOf('\n', endIndex + endMarker.length);
  return `${contents.slice(0, lineStart)}${block}${contents.slice(
    lineEnd === -1 ? contents.length : lineEnd
  )}`;
}

function findGroovyBlock(contents, declaration, fromIndex = 0) {
  const declarationIndex = contents.indexOf(declaration, fromIndex);
  if (declarationIndex === -1) {
    throw new Error(`${PLUGIN_NAME} could not find ${declaration}.`);
  }

  const openingBrace = contents.indexOf('{', declarationIndex);
  let depth = 0;
  for (let index = openingBrace; index < contents.length; index += 1) {
    if (contents[index] === '{') depth += 1;
    if (contents[index] === '}') depth -= 1;
    if (depth === 0) {
      return { start: declarationIndex, end: index + 1 };
    }
  }

  throw new Error(`${PLUGIN_NAME} found an unterminated ${declaration} block.`);
}

function withAndroidReleaseSigning(config) {
  return withAppBuildGradle(config, (gradleConfig) => {
    if (gradleConfig.modResults.language !== 'groovy') {
      throw new Error(`${PLUGIN_NAME} requires a Groovy Android app build file.`);
    }

    let contents = gradleConfig.modResults.contents;

    const replacedEnvironment = replaceMarkedBlock(
      contents,
      ENV_BEGIN_MARKER,
      ENV_END_MARKER,
      ENVIRONMENT_BLOCK
    );
    if (replacedEnvironment === null) {
      const androidIndex = contents.indexOf('\nandroid {');
      if (androidIndex === -1) {
        throw new Error(`${PLUGIN_NAME} could not find the Android configuration block.`);
      }
      contents = `${contents.slice(0, androidIndex)}\n\n${ENVIRONMENT_BLOCK}${contents.slice(
        androidIndex
      )}`;
    } else {
      contents = replacedEnvironment;
    }

    const replacedSigningConfig = replaceMarkedBlock(
      contents,
      SIGNING_BEGIN_MARKER,
      SIGNING_END_MARKER,
      SIGNING_CONFIG_BLOCK
    );
    if (replacedSigningConfig === null) {
      const signingConfigIndex = contents.indexOf('    signingConfigs {\n');
      if (signingConfigIndex === -1) {
        throw new Error(`${PLUGIN_NAME} could not find signingConfigs.`);
      }
      const insertionIndex = signingConfigIndex + '    signingConfigs {\n'.length;
      contents = `${contents.slice(0, insertionIndex)}${SIGNING_CONFIG_BLOCK}\n${contents.slice(
        insertionIndex
      )}`;
    } else {
      contents = replacedSigningConfig;
    }

    const buildTypes = findGroovyBlock(contents, '    buildTypes {');
    const release = findGroovyBlock(contents, '        release {', buildTypes.start);
    if (release.end > buildTypes.end) {
      throw new Error(`${PLUGIN_NAME} found release outside buildTypes.`);
    }

    const releaseContents = contents.slice(release.start, release.end);
    const replacedAssignment = replaceMarkedBlock(
      releaseContents,
      ASSIGNMENT_BEGIN_MARKER,
      ASSIGNMENT_END_MARKER,
      RELEASE_ASSIGNMENT_BLOCK
    );

    let nextReleaseContents = replacedAssignment;
    if (nextReleaseContents === null) {
      const debugSigningLine = /^(\s*)signingConfig signingConfigs\.debug\s*$/m;
      if (!debugSigningLine.test(releaseContents)) {
        throw new Error(`${PLUGIN_NAME} could not find the generated debug release signing line.`);
      }
      nextReleaseContents = releaseContents.replace(debugSigningLine, RELEASE_ASSIGNMENT_BLOCK);
    }

    gradleConfig.modResults.contents = `${contents.slice(
      0,
      release.start
    )}${nextReleaseContents}${contents.slice(release.end)}`;
    return gradleConfig;
  });
}

module.exports = createRunOncePlugin(withAndroidReleaseSigning, PLUGIN_NAME, '1.0.0');
