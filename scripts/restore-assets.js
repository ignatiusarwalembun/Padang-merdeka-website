const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const root = path.resolve(__dirname, '..');
const assets = [
  ['build-assets/styles.css.gz.b64', 'frontend/css/styles.css'],
  ['build-assets/app.js.gz.b64', 'frontend/js/app.js'],
  ['build-assets/console.js.gz.b64', 'frontend/js/console.js']
];

for (const [source, target] of assets) {
  const encoded = fs.readFileSync(path.join(root, source), 'utf8').trim();
  const restored = zlib.gunzipSync(Buffer.from(encoded, 'base64'));
  const output = path.join(root, target);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, restored);
  console.log(`Restored ${target}`);
}
