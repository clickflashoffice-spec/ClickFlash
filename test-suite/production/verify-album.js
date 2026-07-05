const fs = require('fs');
const path = require('path');

const TEST_ALBUM_PATH = 'C:\Users\alamo\Desktop\album';

console.log('=== ClickFlash Production Test - Album Verification ===\n');

// 1. Check if album exists
if (!fs.existsSync(TEST_ALBUM_PATH)) {
  console.error('❌ Test album not found:', TEST_ALBUM_PATH);
  process.exit(1);
}

console.log('✅ Test album folder exists\n');

// 2. List all files
const files = fs.readdirSync(TEST_ALBUM_PATH);
console.log(`📁 Total files in folder: ${files.length}\n`);

// 3. Filter photo files
const photoExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'];
const photos = files.filter(f => {
  const ext = path.extname(f).toLowerCase();
  return photoExtensions.includes(ext);
});

console.log(`📸 Photo files found: ${photos.length}\n`);

// 4. Analyze each photo
let totalSize = 0;
let sizeRanges = { small: 0, medium: 0, large: 0, xlarge: 0 };

const photoDetails = photos.map(f => {
  const stat = fs.statSync(path.join(TEST_ALBUM_PATH, f));
  const sizeKB = stat.size / 1024;
  const sizeMB = sizeKB / 1024;
  totalSize += stat.size;
  
  // Categorize by size
  if (sizeKB < 500) sizeRanges.small++;
  else if (sizeKB < 1000) sizeRanges.medium++;
  else if (sizeKB < 5000) sizeRanges.large++;
  else sizeRanges.xlarge++;
  
  return {
    name: f,
    size: stat.size,
    sizeKB: sizeKB.toFixed(1),
    sizeMB: sizeMB.toFixed(2),
    ext: path.extname(f).toLowerCase()
  };
});

// 5. Print details
console.log('📋 Photo Details:');
console.log('─'.repeat(80));
photoDetails.forEach((p, i) => {
  console.log(`${(i+1).toString().padStart(2)}. ${p.name.padEnd(50)} ${p.sizeKB.padStart(8)}KB (${p.sizeMB.padStart(6)}MB) ${p.ext}`);
});

console.log('\n' + '─'.repeat(80));
console.log(`\n📊 Summary:`);
console.log(`   Total photos: ${photos.length}`);
console.log(`   Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`   Average size: ${((totalSize / photos.length) / 1024).toFixed(1)} KB`);
console.log(`\n📏 Size Distribution:`);
console.log(`   Small (<500KB): ${sizeRanges.small}`);
console.log(`   Medium (500KB-1MB): ${sizeRanges.medium}`);
console.log(`   Large (1MB-5MB): ${sizeRanges.large}`);
console.log(`   XLarge (>5MB): ${sizeRanges.xlarge}`);

// 6. Format breakdown
const formats = {};
photos.forEach(p => {
  const ext = path.extname(p).toLowerCase();
  formats[ext] = (formats[ext] || 0) + 1;
});

console.log(`\n📁 Format Breakdown:`);
Object.entries(formats).forEach(([ext, count]) => {
  console.log(`   ${ext.toUpperCase()}: ${count}`);
});

// 7. Validation checks
console.log('\n✅ Validation Checks:');
const checks = [
  { name: 'Album exists', pass: fs.existsSync(TEST_ALBUM_PATH) },
  { name: 'Has photos', pass: photos.length > 0 },
  { name: 'Has JPG files', pass: (formats['.jpg'] || 0) + (formats['.jpeg'] || 0) > 0 },
  { name: 'Has WEBP files', pass: (formats['.webp'] || 0) > 0 },
  { name: 'Has large photos (>1MB)', pass: sizeRanges.large + sizeRanges.xlarge > 0 },
  { name: 'Total size > 10MB', pass: totalSize > 10 * 1024 * 1024 },
  { name: 'Total photos >= 20', pass: photos.length >= 20 }
];

checks.forEach(c => {
  console.log(`   ${c.pass ? '✅' : '❌'} ${c.name}`);
});

const allPass = checks.every(c => c.pass);
console.log(`\n${allPass ? '✅' : '❌'} All checks ${allPass ? 'PASSED' : 'FAILED'}`);

if (allPass) {
  console.log('\n🎉 Test album is ready for production testing!');
  console.log('   Use this album for:');
  console.log('   • Album import testing');
  console.log('   • Photo editing testing');
  console.log('   • Touch Kiosk sync testing');
  console.log('   • Cloud upload testing');
  console.log('   • Gallery publication testing');
}

process.exit(allPass ? 0 : 1);
