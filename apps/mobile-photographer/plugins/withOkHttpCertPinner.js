const { withMainApplication } = require('@expo/config-plugins');

module.exports = function withOkHttpCertPinner(config) {
  return withMainApplication(config, async (config) => {
    let contents = config.modResults.contents;
    
    // Check if already injected
    if (contents.includes('OkHttpClientProvider.setOkHttpClientFactory')) {
      return config;
    }

    const importStatement = 'import expo.modules.masterconnectivity.MasterOkHttpFactory\nimport com.facebook.react.modules.network.OkHttpClientProvider\n';
    // Inject imports after the package declaration
    contents = contents.replace(/^package (.*)\n/m, `package $1\n\n${importStatement}`);

    // Inject initialization in onCreate
    const initStatement = '    OkHttpClientProvider.setOkHttpClientFactory(MasterOkHttpFactory)\n';
    contents = contents.replace(/(override fun onCreate\(\) \{[\s\S]*?super\.onCreate\(\)\n)/, `$1${initStatement}`);

    config.modResults.contents = contents;
    return config;
  });
};
