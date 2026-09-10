'use strict';
const crypto = require('crypto');

const COOKIE_NAME = 'session';
const SESSION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

// In-memory brute-force throttle. Best-effort only: resets on restart,
// and doesn't survive multiple app instances. Not a hard security boundary.
const attempts = new Map();

function getSecret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error('SESSION_SECRET env var is not set');
  return s;
}

function sha256(s) {
  return crypto.createHash('sha256').update(String(s)).digest();
}

function hmac(data) {
  return crypto.createHmac('sha256', getSecret()).update(data).digest('hex');
}

function sign(expiry) {
  const payload = String(expiry);
  return Buffer.from(payload).toString('base64') + '.' + hmac(payload);
}

function verify(token) {
  if (!token || typeof token !== 'string') return false;
  const dot = token.lastIndexOf('.');
  if (dot === -1) return false;
  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  let payload;
  try {
    payload = Buffer.from(payloadB64, 'base64').toString('utf8');
  } catch (e) {
    return false;
  }
  const expected = hmac(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  const expiry = Number(payload);
  if (!Number.isFinite(expiry) || Date.now() > expiry) return false;
  return true;
}

function isLockedOut(ip) {
  const rec = attempts.get(ip);
  if (!rec) return false;
  if (Date.now() - rec.firstAttemptAt > LOCKOUT_MS) {
    attempts.delete(ip);
    return false;
  }
  return rec.count >= MAX_ATTEMPTS;
}

function recordFailure(ip) {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || now - rec.firstAttemptAt > LOCKOUT_MS) {
    attempts.set(ip, { count: 1, firstAttemptAt: now });
  } else {
    rec.count += 1;
  }
}

function clearFailures(ip) {
  attempts.delete(ip);
}

function passwordMatches(candidate) {
  const real = process.env.APP_PASSWORD;
  if (!real) throw new Error('APP_PASSWORD env var is not set');
  // Hash both sides first so comparison length never leaks input length.
  const a = sha256(candidate || '');
  const b = sha256(real);
  return crypto.timingSafeEqual(a, b);
}

function cookieSecure() {
  return process.env.COOKIE_SECURE !== 'false';
}

function setSessionCookie(res) {
  const expiry = Date.now() + SESSION_MS;
  const token = sign(expiry);
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: cookieSecure(),
    maxAge: SESSION_MS,
    path: '/',
  });
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

function login(req, res) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (isLockedOut(ip)) {
    return res.status(429).json({ error: 'Too many attempts. Try again later.' });
  }
  const { password } = req.body || {};
  if (!passwordMatches(password)) {
    recordFailure(ip);
    return res.status(401).json({ error: 'Wrong password' });
  }
  clearFailures(ip);
  setSessionCookie(res);
  res.json({ ok: true });
}

function logout(req, res) {
  clearSessionCookie(res);
  res.json({ ok: true });
}

function requireAuth(req, res, next) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (verify(token)) return next();
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  return res.redirect(302, '/login.html');
}

module.exports = { login, logout, requireAuth };
