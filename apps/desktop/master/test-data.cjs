const AdmZip = require('adm-zip');
const fs = require('fs');
const archiver = require('archiver');
const os = require('os');
const path = require('path');
const { PassThrough } = require('stream');

async function testArchiver() {
  const stream = new PassThrough();
  const chunks = [];
  stream.on('data', chunk => chunks.push(chunk));
  
  const archive = archiver('zip', { zlib: { level: 0 } });
  archive.pipe(stream);
  archive.append('{"hello":"world"}', { name: 'manifest.json' });
  
  await archive.finalize();
  
  await new Promise(r => stream.on('end', r));
  const buf = Buffer.concat(chunks);
  const tempZip = path.join(os.tmpdir(), 'test.zip');
  fs.writeFileSync(tempZip, buf);
  const zip = new AdmZip(tempZip);
  const entry = zip.getEntry('manifest.json');
  console.log('Data:', entry.getData().toString('utf8'));
}
testArchiver().catch(console.error);
