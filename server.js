// StudyFlow — Local Development Server
// Routes /api/* to local serverless function handlers
// SEC-012 FIX: Serves only from public/ (build output), denies dotfiles, binds to 127.0.0.1
// Compatible with the same codebase deployed to Vercel

const http = require('http');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const PORT = process.env.PORT || 5173;
const HOST = process.env.HOST || '127.0.0.1'; // SEC-012: bind to localhost by default
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');

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

// SEC-012: Body size limit (1 MB)
const MAX_BODY_SIZE = 1 * 1024 * 1024;

// Parse JSON body with size limit
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) {
        reject(new Error('Request body too large'));
        req.destroy();
        return;
      }
      body += chunk.toString();
    });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch (e) { resolve({}); }
    });
    req.on('error', reject);
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
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(this._status);
        res.end(JSON.stringify(data));
      }
    },
    end(data) {
      if (!res.headersSent) {
        res.writeHead(this._status);
        res.end(data || '');
      }
    }
  };
}

const server = http.createServer(async (req, res) => {
  // Security headers (mirror Vercel config)
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // CORS for dev
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
      // Also clear lib/ caches for hot-reload
      try { delete require.cache[require.resolve('./lib/db.js')]; } catch {}
      try { delete require.cache[require.resolve('./lib/auth.js')]; } catch {}
      try { delete require.cache[require.resolve('./lib/http.js')]; } catch {}
      try { delete require.cache[require.resolve('./lib/errors.js')]; } catch {}
      try { delete require.cache[require.resolve('./lib/db-init.js')]; } catch {}

      const handler = require(handlerPath);
      const body = await parseBody(req);
      const shimReq = { method: req.method, url: req.url, headers: req.headers, body, query: Object.fromEntries(url.searchParams) };
      const shimRes = makeRes(res);
      await handler(shimReq, shimRes);
    } catch (err) {
      console.error(`API ${reqPath} error:`, err.message);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        // SEC-021: Don't return err.message in dev server either
        res.end(JSON.stringify({ ok: false, error: 'Internal server error' }));
      }
    }
    return;
  }

  // ─── Static File Serving (SEC-012: serve from public/ only) ────────
  // For the root path, also try index.html from the project root (for dev convenience)
  let filePath;
  if (reqPath === '/' || reqPath === '') {
    // Try public/index.html first, fall back to root index.html
    const publicIndex = path.join(PUBLIC, 'index.html');
    filePath = fs.existsSync(publicIndex) ? publicIndex : path.join(ROOT, 'index.html');
  } else {
    // SEC-012: Deny dotfiles (e.g. /.env, /.git)
    if (reqPath.includes('/.') || reqPath.startsWith('.')) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'Not found' }));
      return;
    }

    // Try public/ first, then root for dev assets (css/, js/)
    const publicPath = path.join(PUBLIC, reqPath);
    const rootPath = path.join(ROOT, reqPath);

    if (fs.existsSync(publicPath)) {
      filePath = publicPath;
    } else if (fs.existsSync(rootPath)) {
      // Allow css/ and js/ from root for dev, but nothing else sensitive
      const allowed = ['/css/', '/js/', '/assets/'];
      if (allowed.some(prefix => reqPath.startsWith(prefix))) {
        filePath = rootPath;
      } else {
        filePath = publicPath; // Will 404
      }
    } else {
      filePath = publicPath;
    }
  }

  // Ensure resolved path is within allowed directories
  const resolvedPath = path.resolve(filePath);
  if (!resolvedPath.startsWith(PUBLIC) && !resolvedPath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(resolvedPath, (err, stats) => {
    if (err || !stats.isFile()) {
      // SPA fallback — serve index.html
      const indexPath = fs.existsSync(path.join(PUBLIC, 'index.html'))
        ? path.join(PUBLIC, 'index.html')
        : path.join(ROOT, 'index.html');

      fs.readFile(indexPath, (e, data) => {
        if (e) { res.writeHead(404); res.end('Not Found'); return; }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
        res.end(data);
      });
      return;
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';
    fs.readFile(resolvedPath, (e, data) => {
      if (e) { res.writeHead(500); res.end('Server Error'); return; }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`\n🚀 StudyFlow server running at http://${HOST}:${PORT}/`);
  console.log(`📡 Neon DB: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
  console.log(`🔐 JWT_SECRET: ${process.env.JWT_SECRET ? 'Set ✓' : '⚠ NOT SET — auth will fail!'}`);
  console.log(`📁 API routes: /api/data, /api/write, /api/auth, /api/reports`);
  console.log(`\nOpen http://${HOST}:${PORT}/ in your browser.\n`);
});
