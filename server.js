import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sendBookingEmail } from './api/send.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple, zero-dependency .env loader
function loadEnv() {
  const envPath = path.resolve(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    } catch (e) {
      console.warn('Could not read .env file:', e.message);
    }
  }
}

loadEnv();

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) { // 1MB limit
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', err => reject(err));
  });
}

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // Health check for Render
  if (pathname === '/healthz' || pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  // API endpoint: POST /api/send
  if (pathname === '/api/send' && req.method === 'POST') {
    try {
      const rawBody = await readRequestBody(req);
      const data = rawBody ? JSON.parse(rawBody) : {};
      const result = await sendBookingEmail(data, process.env);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, id: result.id }));
    } catch (error) {
      console.error('[API /api/send Error]:', error.message);
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: error.message }));
    }
    return;
  }

  // Static files handler
  if (req.method === 'GET' || req.method === 'HEAD') {
    let relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    relativePath = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, '');
    const filePath = path.join(__dirname, relativePath);

    // Prevent directory traversal
    if (!filePath.startsWith(__dirname)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    try {
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        const indexInDir = path.join(filePath, 'index.html');
        if (fs.existsSync(indexInDir)) {
          const content = fs.readFileSync(indexInDir);
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(content);
          return;
        }
      }

      if (stat.isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        if (req.method === 'HEAD') {
          res.end();
        } else {
          fs.createReadStream(filePath).pipe(res);
        }
        return;
      }
    } catch {
      // Not found
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
    return;
  }

  res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Method Not Allowed');
});

server.listen(PORT, HOST, () => {
  const hasKey = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.startsWith('re_'));
  const toEmail = process.env.TO_EMAIL || 'rodeorent1@gmail.com';
  console.log(`--------------------------------------------------------`);
  console.log(`🐂 RODEO EVENT server running at http://${HOST}:${PORT}`);
  console.log(`📨 Resend API Key: ${hasKey ? 'Configured ✓' : 'NOT SET ⚠️ (Add to .env or Render dashboard)'}`);
  console.log(`📬 Recipient: ${toEmail}`);
  console.log(`--------------------------------------------------------`);
});
