const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const beehiivHandler = require('./api/subscribe');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

function sendNotFound(res) {
  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end('Not Found');
}

function serveStatic(req, res, pathname) {
  let filePath = path.join(ROOT_DIR, pathname);

  if (filePath.endsWith(path.sep)) {
    filePath = path.join(filePath, 'new.html');
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'new.html');
  }

  if (!fs.existsSync(filePath)) {
    // support / -> /new.html
    if (pathname === '/' || pathname === '') {
      filePath = path.join(ROOT_DIR, 'new.html');
    } else {
      return sendNotFound(res);
    }
  }

  fs.createReadStream(filePath)
    .on('open', () => {
      const ext = path.extname(filePath).toLowerCase();
      const mime = MIME_TYPES[ext] || 'application/octet-stream';
      res.statusCode = 200;
      res.setHeader('Content-Type', mime);
    })
    .on('error', (err) => {
      console.error('Static file error:', err);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('Internal Server Error');
    })
    .pipe(res);
}

function wrapResponse(res) {
  return {
    status(code) {
      res.statusCode = code;
      return this;
    },
    json(payload) {
      const body = JSON.stringify(payload);
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
      }
      res.end(body);
      return this;
    },
    setHeader(name, value) {
      res.setHeader(name, value);
    },
  };
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      if (!chunks.length) return resolve(undefined);
      const raw = Buffer.concat(chunks).toString('utf8');
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve(raw);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname || '/';

  if (pathname === '/api/subscribe' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      req.body = body;
      req.query = parsedUrl.query;

      await beehiivHandler(req, wrapResponse(res));
    } catch (error) {
      console.error('API route error:', error);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
    return;
  }

  if (pathname.startsWith('/api/')) {
    return sendNotFound(res);
  }

  serveStatic(req, res, pathname);
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
