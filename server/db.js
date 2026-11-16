// Stockage des comptes : un fichier JSON par pirate, mot de passe haché (scrypt).
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const scrypt = (pass, salt) => new Promise((res, rej) => crypto.scrypt(pass, salt, 32, { N: 16384, r: 8, p: 1 }, (e, k) => (e ? rej(e) : res(k))));

export class FileStorage {
  constructor(dir) {
    this.dir = path.resolve(dir, 'accounts');
    this.queues = new Map();
    this.ready = fs.mkdir(this.dir, { recursive: true });
  }
  file(key) { return path.join(this.dir, crypto.createHash('sha1').update(key).digest('hex') + '.json'); }
  async read(key) {
    try { return JSON.parse(await fs.readFile(this.file(key), 'utf8')); } catch (e) { return null; }
  }
  async write(key, obj) {
    // écritures sérialisées par compte, et atomiques (fichier temporaire + renommage)
    const prev = this.queues.get(key) || Promise.resolve();
    const next = prev.then(async () => {
      const f = this.file(key), tmp = f + '.' + process.pid + '.tmp';
      await fs.writeFile(tmp, JSON.stringify(obj));
      await fs.rename(tmp, f);
    }).catch((e) => console.error('[db] écriture', e.message));
    this.queues.set(key, next);
    return next;
  }
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
  async loadWorld() {
    try { return JSON.parse(await fs.readFile(path.join(this.dir, '..', 'world.json'), 'utf8')); } catch (e) { return null; }
  }
  async saveWorld(obj) {
    const f = path.join(this.dir, '..', 'world.json'), tmp = f + '.' + process.pid + '.tmp';
    await fs.writeFile(tmp, JSON.stringify(obj));
    await fs.rename(tmp, f);
  }
  async save(key, data) {
    await this.ready;
    const acc = await this.read(key);
    if (!acc) return;
    acc.data = data;
    acc.updated = Date.now();
    await this.write(key, acc);
  }
}
