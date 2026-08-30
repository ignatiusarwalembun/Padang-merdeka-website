const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const archiver = require('archiver');

const proxyBase = String(process.env.NETLIFY_DEPLOY_PROXY || '').replace(/\/$/, '');
const siteId = String(process.env.NETLIFY_SITE_ID || '');

if (!proxyBase || !siteId) {
  console.log('[NETLIFY-UPLOAD] Skipped: NETLIFY_DEPLOY_PROXY / NETLIFY_SITE_ID not configured.');
  process.exit(0);
}

const zipPath = path.join(os.tmpdir(), `padang-merdeka-${Date.now()}.zip`);

function makeZip() {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', resolve);
    archive.on('error', reject);
    archive.pipe(output);
    archive.glob('**/*', {
      cwd: process.cwd(),
      dot: true,
      ignore: [
        'node_modules/**',
        '.git/**',
        '.netlify/**',
        '.env',
        'backend/data/**',
        'deploy-*.zip'
      ]
    });
    archive.finalize();
  });
}

async function upload() {
  await makeZip();
  const file = fs.readFileSync(zipPath);
  const boundary = `----NetlifyFormBoundary${crypto.randomUUID().replace(/-/g, '')}`;
  const head = Buffer.from(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="zip"; filename="padang-merdeka.zip"\r\n` +
    `Content-Type: application/zip\r\n\r\n`
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  const body = Buffer.concat([head, file, tail]);
  const endpoint = `${proxyBase}/api/v1/sites/${siteId}/builds`;

  console.log(`[NETLIFY-UPLOAD] Uploading ${file.length} bytes...`);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': `multipart/form-data; boundary=${boundary}`,
      'content-length': String(body.length),
      'user-agent': 'padang-merdeka-deploy-helper'
    },
    body
  });
  const text = await response.text();
  console.log(`[NETLIFY-UPLOAD] Response ${response.status}: ${text.slice(0, 1200)}`);
  if (!response.ok) throw new Error(`Netlify upload failed: ${response.status}`);
  fs.unlinkSync(zipPath);
}

upload().catch(err => {
  console.error('[NETLIFY-UPLOAD] FAILED', err);
  try { if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath); } catch {}
  process.exit(1);
});
