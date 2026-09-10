'use strict';
const fs = require('fs');
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');

const auth = require('./server/auth');
const store = require('./server/store');
const spot = require('./server/spot');

// Minimal .env loader (no dependency needed) — only fills in vars that
// aren't already set, so real environment vars (e.g. from docker-compose's
// env_file) always win over a stray local .env file.
function loadDotEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
loadDotEnv();

if (!process.env.APP_PASSWORD || !process.env.SESSION_SECRET) {
  console.error('Missing APP_PASSWORD or SESSION_SECRET env vars. Copy .env.example to .env and fill them in.');
  process.exit(1);
}

const app = express();
app.set('trust proxy', true); // running behind Traefik in production

app.use(cookieParser());
app.use(express.json());

// --- Public routes (no auth) ---
app.get('/healthz', (req, res) => res.status(200).send('ok'));
app.post('/api/login', auth.login);
app.post('/api/logout', auth.logout);
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Read-only public view — no login, no writes. Serves only the latest
// saved snapshot; never exposes the full history or the write endpoint.
app.get('/view', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'view.html'));
});
app.get('/api/public/latest', (req, res) => {
  const all = store.readSnapshots();
  const dates = Object.keys(all).sort();
  const latestDate = dates[dates.length - 1];
  const latest = latestDate ? all[latestDate] : null;
  res.json({
    date: latestDate || null,
    simple: (latest && latest.simple) || [],
    hedged: (latest && latest.hedged) || [],
  });
});

// --- Everything below requires a valid session ---
app.use(auth.requireAuth);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/snapshots', (req, res) => {
  res.json(store.readSnapshots());
});

app.put('/api/snapshots', (req, res) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ error: 'body must be a JSON object' });
  }
  store.writeSnapshots(req.body);
  res.json({ ok: true });
});

app.get('/api/spot', spot.getSpot);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Trading journal listening on port ${PORT}`);
});
