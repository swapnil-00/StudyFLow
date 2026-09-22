const http = require('http');
const fs = require('fs');
const path = require('path');
const dns = require('dns');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');

// Ensure reliable DNS resolution for Neon endpoints
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
  const origLookup = dns.lookup;
  dns.lookup = function(hostname, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    dns.resolve4(hostname, (err, addresses) => {
      if (!err && addresses && addresses.length > 0) {
        if (options && options.all) {
          callback(null, addresses.map(a => ({ address: a, family: 4 })));
        } else {
          callback(null, addresses[0], 4);
        }
      } else {
        origLookup(hostname, options, callback);
      }
    });
  };
} catch (e) {}

const PORT = process.env.PORT || 5173;
const ROOT = __dirname;
let DATABASE_URL = (process.env.DATABASE_URL || '').replace('&channel_binding=require', '').replace('channel_binding=require', '');

// Optional Neon Pool (initialized if valid connection string exists)
let dbPool = null;
const isRealDbConfigured = DATABASE_URL && !DATABASE_URL.includes('YOUR_NEON_PASSWORD_HERE') && !DATABASE_URL.includes('sample');

if (isRealDbConfigured) {
  dbPool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });
}

const MIME = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
};

const server = http.createServer(async (req, res) => {
  // CORS & headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  let reqPath = decodeURIComponent(req.url.split('?')[0]);

  // ─── API Routes ───────────────────────────────────────────────────────────
  if (reqPath === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return;
  }

  if (reqPath === '/api/db-status') {
    if (!isRealDbConfigured || !dbPool) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        connected: false,
        provider: 'Neon PostgreSQL',
        configured: false,
        message: 'DATABASE_URL is not configured with your real Neon connection string in .env',
        instructions: 'Paste your Neon DB connection string into .env and run npm run migrate'
      }));
      return;
    }

    try {
      const client = await dbPool.connect();
      const dbInfo = await client.query('SELECT current_database() as db, version() as version, NOW() as server_time');
      const tableCheck = await client.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      client.release();

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        connected: true,
        provider: 'Neon PostgreSQL',
        configured: true,
        database: dbInfo.rows[0].db,
        serverTime: dbInfo.rows[0].server_time,
        tableCount: tableCheck.rowCount,
        tables: tableCheck.rows.map(r => r.table_name)
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        connected: false,
        provider: 'Neon PostgreSQL',
        configured: true,
        error: err.message
      }));
    }
    return;
  }

  // ─── Static File Serving ──────────────────────────────────────────────────
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  let filePath = path.join(ROOT, reqPath);

  // Security: prevent directory traversal
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to index.html for SPA routing
      const indexPath = path.join(ROOT, 'index.html');
      fs.readFile(indexPath, (readErr, indexContent) => {
        if (readErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 Not Found');
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
          res.end(indexContent);
        }
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, data) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
        return;
      }

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`StudyFlow server running at http://localhost:${PORT}/`);
  if (!isRealDbConfigured) {
    console.log(`ℹ️  Neon DB: Waiting for connection string in .env (DATABASE_URL)`);
  } else {
    console.log(`📡 Neon DB: Configured`);
  }
});
