'use strict';
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'snapshots.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const SEED_FILE = path.join(__dirname, '..', 'snapshots.json');
const MAX_BACKUPS = 30;

function ensureSeeded() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    const seed = fs.existsSync(SEED_FILE) ? fs.readFileSync(SEED_FILE) : '{}';
    fs.writeFileSync(DATA_FILE, seed);
  }
}

function readSnapshots() {
  ensureSeeded();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    return {};
  }
}

function pruneBackups() {
  let files;
  try {
    files = fs.readdirSync(BACKUP_DIR).filter((f) => f.startsWith('snapshots-'));
  } catch (e) {
    return;
  }
  files.sort(); // ISO timestamps in the filename sort chronologically
  const excess = files.length - MAX_BACKUPS;
  for (let i = 0; i < excess; i++) {
    try { fs.unlinkSync(path.join(BACKUP_DIR, files[i])); } catch (e) {}
  }
}

function backupCurrent() {
  if (!fs.existsSync(DATA_FILE)) return;
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.copyFileSync(DATA_FILE, path.join(BACKUP_DIR, `snapshots-${stamp}.json`));
  pruneBackups();
}

function writeSnapshots(obj) {
  ensureSeeded();
  backupCurrent();
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

module.exports = { readSnapshots, writeSnapshots, DATA_DIR, DATA_FILE };
