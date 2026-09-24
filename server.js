// StudyFlow — Local Development Server
// Routes /api/* to local serverless function handlers
// Static files are served directly
// Compatible with the same codebase deployed to Vercel

const http = require('http');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const PORT = process.env.PORT || 5173;
const ROOT = __dirname;

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

// Parse JSON body
function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch (e) { resolve({}); }
    });
  });
}

// Minimal response shim for Vercel handler signature
function makeRes(res) {
  return {
    _headers: {},
    _body: null,
    _status: 200,
    setHeader(k, v) { res.setHeader(k, v); return this; },
    status(code) { this._status = code; return this; },
    json(data) {
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(this._status);
      res.end(JSON.stringify(data));
    },
    end(data) {
      res.writeHead(this._status);
      res.end(data || '');
    }
  };
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const reqPath = url.pathname;

  // ─── API Routes ──────────────────────────────────────────────────
  if (reqPath.startsWith('/api/')) {
    const segment = reqPath.replace('/api/', '').split('/')[0];
    const handlerPath = path.join(ROOT, 'api', `${segment}.js`);

    if (!fs.existsSync(handlerPath)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: `API route /api/${segment} not found` }));
      return;
    }

    try {
      // Clear require cache so edits reload automatically in dev
      delete require.cache[require.resolve(handlerPath)];
      delete require.cache[require.resolve('./api/db.js')];

      const handler = require(handlerPath);
      const body = await parseBody(req);
      const shimReq = { method: req.method, url: req.url, headers: req.headers, body, query: Object.fromEntries(url.searchParams) };
      const shimRes = makeRes(res);
      await handler(shimReq, shimRes);
    } catch (err) {
      console.error(`API ${reqPath} error:`, err.message);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    }
    return;
  }

  // ─── Static File Serving ─────────────────────────────────────────
  let filePath = reqPath === '/' || reqPath === '' ? path.join(ROOT, 'index.html') : path.join(ROOT, reqPath);

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // SPA fallback
      fs.readFile(path.join(ROOT, 'index.html'), (e, data) => {
        if (e) { res.writeHead(404); res.end('Not Found'); return; }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
        res.end(data);
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';
    fs.readFile(filePath, (e, data) => {
      if (e) { res.writeHead(500); res.end('Server Error'); return; }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 StudyFlow server running at http://localhost:${PORT}/`);
  console.log(`📡 Neon DB: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
  console.log(`📁 API routes: /api/data, /api/write, /api/students`);
  console.log(`\nOpen http://localhost:${PORT}/ in your browser.\n`);
});
