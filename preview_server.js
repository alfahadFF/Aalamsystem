#!/usr/bin/env node
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const ROOT = __dirname;
const SB = 'https://xqsbyosxzfqqzzgwppyk.supabase.co';
const PORT = Number(process.env.PORT || process.argv[2] || 3000);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
};

const FWD = ['authorization', 'apikey', 'accept', 'content-type', 'prefer', 'range', 'accept-profile', 'content-profile'];

function baseHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS,HEAD',
    'Cache-Control': 'no-store, max-age=0',
  };
}

function send(res, code, body, extra) {
  res.writeHead(code, Object.assign(baseHeaders(), extra || {}));
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url || '/', 'http://preview.local');
    if (req.method === 'OPTIONS') {
      send(res, 204, '');
      return;
    }
    if (u.pathname === '/__ok') {
      send(res, 200, 'ok', { 'Content-Type': 'text/plain; charset=utf-8' });
      return;
    }
    if (u.pathname.startsWith('/rest/v1/')) {
      const headers = {};
      for (const k of FWD) {
        if (req.headers[k]) headers[k] = req.headers[k];
      }
      const method = req.method || 'GET';
      const init = { method, headers };
      if (method !== 'GET' && method !== 'HEAD') init.body = await readBody(req);
      const r = await fetch(SB + u.pathname + u.search, init);
      const buf = Buffer.from(await r.arrayBuffer());
      const out = baseHeaders();
      const ct = r.headers.get('content-type');
      if (ct) out['Content-Type'] = ct;
      const cr = r.headers.get('content-range');
      if (cr) out['Content-Range'] = cr;
      res.writeHead(r.status, out);
      res.end(buf);
      return;
    }

    let p = decodeURIComponent(u.pathname);
    if (p === '/') p = '/pos.html';
    const file = path.normalize(path.join(ROOT, p));
    if (!file.startsWith(ROOT + path.sep) && file !== ROOT) {
      send(res, 403, 'forbidden', { 'Content-Type': 'text/plain' });
      return;
    }
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) {
        send(res, 404, 'not found', { 'Content-Type': 'text/plain; charset=utf-8' });
        return;
      }
      const ext = path.extname(file).toLowerCase();
      const type = MIME[ext] || 'application/octet-stream';
      fs.readFile(file, (e2, data) => {
        if (e2) {
          send(res, 500, 'read error', { 'Content-Type': 'text/plain' });
          return;
        }
        send(res, 200, data, { 'Content-Type': type });
      });
    });
  } catch (e) {
    send(res, 500, String(e && e.message || e), { 'Content-Type': 'text/plain; charset=utf-8' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('listening 0.0.0.0:' + PORT);
});
