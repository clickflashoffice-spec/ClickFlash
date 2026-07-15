const fs = require('fs');

const staffDeps = {
  'tailwindcss': '^4',
  'nativewind': '5.0.0-preview.2',
  'react-native-css': '0.0.0-nightly.5ce6396',
  '@tailwindcss/postcss': '*',
  'tailwind-merge': '*',
  'clsx': '*',
  'expo-sqlite': '*',
  'expo-haptics': '*'
};

const customerDeps = {
  'tailwindcss': '^4',
  'nativewind': '5.0.0-preview.2',
  'react-native-css': '0.0.0-nightly.5ce6396',
  '@tailwindcss/postcss': '*',
  'tailwind-merge': '*',
  'clsx': '*',
  '@tensorflow/tfjs-react-native': '*',
  '@tensorflow/tfjs': '*',
  '@tensorflow-models/blazeface': '*'
};

function addDeps(app, newDeps) {
  const path = `C:/Users/alamo/Desktop/ClickFlash/apps/${app}/package.json`;
  const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));
  pkg.dependencies = pkg.dependencies || {};
  Object.assign(pkg.dependencies, newDeps);
  fs.writeFileSync(path, JSON.stringify(pkg, null, 2));
}

addDeps('mobile-staff', staffDeps);
addDeps('mobile-customer', customerDeps);
console.log('Dependencies injected!');
