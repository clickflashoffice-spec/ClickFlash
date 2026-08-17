const AdmZip = require('adm-zip');
const archiver = require('archiver');
const { PassThrough } = require('stream');

async function testArchiver() {
  const stream = new PassThrough();
  const chunks = [];
  
  const archive = archiver('zip', { zlib: { level: 6 } });
  archive.pipe(stream);
  archive.append('{"hello":"world"}', { name: 'manifest.json' });
  const p = archive.finalize();
  
  for await (const chunk of stream) { chunks.push(chunk); }
  await p;
  
  const buf = Buffer.concat(chunks);
  const zip = new AdmZip(buf);
  const entry = zip.getEntry('manifest.json');
  console.log('Data length:', entry.getData().length);
}
testArchiver().catch(console.error);
