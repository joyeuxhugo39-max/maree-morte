// Stockage des comptes : un fichier JSON par pirate, mot de passe haché (scrypt).
// 1.0 : chaque écriture garde la version précédente (.bak) ; un fichier illisible est mis de côté
// et la copie de secours prend le relais ; des instantanés horaires et quotidiens de tout le dossier
// sont conservés dans data/backups (voir scripts/restore.mjs pour revenir en arrière).
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const HOURLY_KEEP = 24, DAILY_KEEP = 14;
const stamp = (d = new Date()) => d.toISOString().slice(0, 13).replace(/[-:T]/g, '');

const scrypt = (pass, salt) => new Promise((res, rej) => crypto.scrypt(pass, salt, 32, { N: 16384, r: 8, p: 1 }, (e, k) => (e ? rej(e) : res(k))));

export class FileStorage {
  constructor(dir) {
    this.dir = path.resolve(dir, 'accounts');
    this.queues = new Map();
    this.ready = fs.mkdir(this.dir, { recursive: true });
  }
  file(key) { return path.join(this.dir, crypto.createHash('sha1').update(key).digest('hex') + '.json'); }
  async read(key) { return this.readFile(this.file(key)); }
  async readFile(f) {
    let txt;
    try { txt = await fs.readFile(f, 'utf8'); } catch (e) { return null; } // pas encore de fichier
    try { return JSON.parse(txt); } catch (e) {
      // fichier abîmé : on le met de côté (jamais effacé) et on reprend la copie précédente
      const bad = f + '.corrompu-' + Date.now();
      await fs.rename(f, bad).catch(() => {});
      console.error('[db] fichier illisible mis de côté :', path.basename(bad));
      try { const prev = JSON.parse(await fs.readFile(f + '.bak', 'utf8')); await fs.writeFile(f, JSON.stringify(prev)); return prev; } catch (e2) { return null; }
    }
  }
  // toutes les opérations d'un compte passent par sa file : jamais deux écritures croisées
  enqueue(key, fn) {
    const prev = this.queues.get(key) || this.ready;
    const next = prev.then(fn).catch((e) => console.error('[db] écriture', e.message));
    this.queues.set(key, next);
    return next;
  }
  async rawWrite(key, obj) { // atomique : fichier temporaire, copie de secours, renommage
    const f = this.file(key), tmp = f + '.' + process.pid + '.tmp';
    await fs.writeFile(tmp, JSON.stringify(obj));
    await fs.copyFile(f, f + '.bak').catch(() => {}); // la version précédente reste disponible
    await fs.rename(tmp, f);
  }
  write(key, obj) { return this.enqueue(key, () => this.rawWrite(key, obj)); }
  async auth(key, name, pass) {
    await this.ready;
    const acc = await this.read(key);
    if (!acc) {
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = (await scrypt(pass, salt)).toString('hex');
      await this.write(key, { name, salt, hash, created: Date.now(), data: null });
      return { ok: true, data: null };
    }
    const h = await scrypt(pass, acc.salt);
    const ok = crypto.timingSafeEqual(h, Buffer.from(acc.hash, 'hex'));
    if (!ok) return { ok: false, err: 'Ce nom de pirate existe déjà et le mot de passe est incorrect.' };
    return { ok: true, data: acc.data };
  }
  // 1.0 : données du compte sans mot de passe (reprise après une coupure, jeton déjà vérifié)
  async loadData(key) { await this.ready; const acc = await this.read(key); return acc ? acc.data : null; }
  // petites données du serveur : bannissements, signalements, classements...
  async loadMeta(name) { await this.ready; return this.readFile(path.join(this.dir, '..', 'meta-' + name + '.json')); }
  saveMeta(name, obj) {
    const f = path.join(this.dir, '..', 'meta-' + name + '.json');
    return this.enqueue('meta:' + name, async () => { const tmp = f + '.tmp'; await fs.writeFile(tmp, JSON.stringify(obj)); await fs.copyFile(f, f + '.bak').catch(() => {}); await fs.rename(tmp, f); });
  }
  // journal des transactions : une ligne JSON par événement, un fichier par jour, écrit par paquets
  audit(entry) {
    (this.auditBuf = this.auditBuf || []).push(JSON.stringify(entry));
    if (!this.auditT) this.auditT = setTimeout(() => this.flushAudit(), 2000);
  }
  async flushAudit() {
    this.auditT = null;
    const lines = this.auditBuf || []; this.auditBuf = [];
    if (!lines.length) return;
    const dir = path.join(this.dir, '..', 'journal');
    await fs.mkdir(dir, { recursive: true });
    await fs.appendFile(path.join(dir, new Date().toISOString().slice(0, 10) + '.jsonl'), lines.join('\n') + '\n').catch((e) => console.error('[journal]', e.message));
  }
  async readJournal(day, q = '', limit = 300) {
    const f = path.join(this.dir, '..', 'journal', (day || new Date().toISOString().slice(0, 10)) + '.jsonl');
    const txt = await fs.readFile(f, 'utf8').catch(() => '');
    const lines = txt.split('\n').filter((l) => l && (!q || l.toLowerCase().includes(q.toLowerCase())));
    return lines.slice(-limit).reverse().map((l) => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean);
  }
  async listAccounts(q = '', limit = 200) {
    await this.ready;
    const files = (await fs.readdir(this.dir)).filter((n) => n.endsWith('.json'));
    const out = [];
    for (const f of files) {
      const acc = await this.readFile(path.join(this.dir, f)); if (!acc) continue;
      if (q && !String(acc.name || '').toLowerCase().includes(q.toLowerCase())) continue;
      const dd = acc.data || {};
      out.push({ name: acc.name, created: acc.created, updated: acc.updated, level: dd.level || 1, gold: dd.gold || 0, sv: dd.sv || 8 });
      if (out.length >= limit) break;
    }
    return out.sort((a, b) => (b.updated || 0) - (a.updated || 0));
  }
  async listSnapshots() { return (await fs.readdir(path.join(this.dir, '..', 'backups')).catch(() => [])).sort().reverse(); }
  async restoreAccount(snap, key) {
    const f = crypto.createHash('sha1').update(key).digest('hex') + '.json';
    const src = path.join(this.dir, '..', 'backups', path.basename(snap), 'accounts', f);
    const acc = await this.readFile(src); if (!acc) throw new Error('compte absent de cet instantané');
    await this.snapshot('avant-restauration');
    await this.enqueue(key, () => this.rawWrite(key, acc));
    return true;
  }
  async loadWorld() { return this.readFile(path.join(this.dir, '..', 'world.json')); }
  async saveWorld(obj) {
    const f = path.join(this.dir, '..', 'world.json'), tmp = f + '.' + process.pid + '.tmp';
    this.worldQ = (this.worldQ || Promise.resolve()).then(async () => {
      await fs.writeFile(tmp, JSON.stringify(obj));
      await fs.copyFile(f, f + '.bak').catch(() => {});
      await fs.rename(tmp, f);
    }).catch((e) => console.error('[db] monde', e.message));
    return this.worldQ;
  }
  // attend la fin de toutes les écritures en cours (arrêt propre)
  async flush() { await this.flushAudit(); await Promise.all([...this.queues.values(), this.worldQ || Promise.resolve()]); }
  // instantané complet (comptes + monde) dans data/backups/AAAAMMJJHH, avec rotation
  async snapshot(tag = '') {
    await this.ready; await this.flush();
    const root = path.resolve(this.dir, '..'), dir = path.join(root, 'backups'), name = stamp() + (tag ? '-' + tag : '');
    const dest = path.join(dir, name);
    await fs.mkdir(dest, { recursive: true });
    await fs.cp(this.dir, path.join(dest, 'accounts'), { recursive: true, filter: (src) => !/\.(tmp|bak)$|\.corrompu-/.test(src) });
    await fs.copyFile(path.join(root, 'world.json'), path.join(dest, 'world.json')).catch(() => {});
    await fs.writeFile(path.join(dest, 'info.json'), JSON.stringify({ at: new Date().toISOString(), tag }));
    // rotation : les 24 derniers instantanés horaires, plus un par jour sur 14 jours, plus ceux étiquetés
    const all = (await fs.readdir(dir)).filter((n) => /^\d{10}/.test(n)).sort();
    const plain = all.filter((n) => /^\d{10}$/.test(n));
    const keepDaily = new Set(), seenDays = new Set();
    for (const n of [...plain].reverse()) { const day = n.slice(0, 8); if (!seenDays.has(day)) { seenDays.add(day); if (keepDaily.size < DAILY_KEEP) keepDaily.add(n); } }
    const keep = new Set([...plain.slice(-HOURLY_KEEP), ...keepDaily]);
    const tagged = all.filter((n) => !/^\d{10}$/.test(n)).slice(-20);
    for (const n of all) if (!keep.has(n) && !tagged.includes(n)) await fs.rm(path.join(dir, n), { recursive: true, force: true });
    return name;
  }
  save(key, data) {
    return this.enqueue(key, async () => {
      const acc = await this.read(key);
      if (!acc) return;
      acc.data = data;
      acc.updated = Date.now();
      await this.rawWrite(key, acc);
    });
  }
}
