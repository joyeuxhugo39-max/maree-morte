// LStudio — les sauvegardes. Tout reste dans ce navigateur (IndexedDB), sauf la publication, qui écrit le monde dans
// le dépôt GitHub du jeu (docs/monde-studio.json, que le jeu publié charge au démarrage).
//  - le brouillon : enregistré automatiquement à chaque modification ;
//  - les versions : enregistrées à la main (avec un nom), automatiquement de temps en temps, avant chaque restauration
//    ou import (on ne remplace jamais un brouillon sans en garder une copie), et à chaque publication ;
//  - la version de test : celle que l'on joue dans le vrai jeu (« Tester dans le jeu ») ;
//  - les réglages, dont la clé GitHub de l'administrateur (seulement s'il demande à la mémoriser, et seulement ici).
const DB = 'lstudio', VER = 1;
let dbp = null;
function db() {
  if (dbp) return dbp;
  dbp = new Promise((ok, ko) => {
    const r = indexedDB.open(DB, VER);
    r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv'); if (!d.objectStoreNames.contains('versions')) d.createObjectStore('versions', { keyPath: 'id', autoIncrement: true }); };
    r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error);
  });
  return dbp;
}
const tx = async (store, mode, fn) => { const d = await db(); return new Promise((ok, ko) => { const t = d.transaction(store, mode), s = t.objectStore(store); let res; Promise.resolve(fn(s)).then((v) => { res = v; }); t.oncomplete = () => ok(res); t.onerror = () => ko(t.error); t.onabort = () => ko(t.error || new Error('écriture annulée')); }); };
const req = (r) => new Promise((ok, ko) => { r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });
const clone = (o) => JSON.parse(JSON.stringify(o));

export const store = {
  async get(k) { return tx('kv', 'readonly', (s) => req(s.get(k))); },
  async put(k, v) { return tx('kv', 'readwrite', (s) => req(s.put(clone(v), k))); },
  async del(k) { return tx('kv', 'readwrite', (s) => req(s.delete(k))); },
  // les versions
  async addVersion(type, nom, doc) {
    const v = { type, nom, date: new Date().toISOString(), doc: clone(doc), stats: stats(doc) };
    const id = await tx('versions', 'readwrite', (s) => req(s.add(v)));
    if (type === 'auto') await this.prune();
    return id;
  },
  async versions() { const all = await tx('versions', 'readonly', (s) => req(s.getAll())); return all.map(({ doc, ...v }) => v).sort((a, b) => b.id - a.id); },
  async version(id) { return tx('versions', 'readonly', (s) => req(s.get(id))); },
  async delVersion(id) { return tx('versions', 'readwrite', (s) => req(s.delete(id))); },
  async prune() { // on garde les 30 dernières versions automatiques ; les autres types ne sont jamais effacés sans qu'on le demande
    const all = (await tx('versions', 'readonly', (s) => req(s.getAll()))).filter((v) => v.type === 'auto').sort((a, b) => b.id - a.id);
    for (const v of all.slice(30)) await this.delVersion(v.id);
  },
};
export function stats(doc) {
  return { sol: Object.keys(doc.sol || {}).length, regions: Object.keys(doc.regions || {}).length, collisions: Object.keys(doc.collisions || {}).length, navigation: Object.keys(doc.navigation || {}).length, decors: (doc.decors || []).length, retouches: Object.keys(doc.retouches || {}).length };
}

// ------------------------------------------------------------------ la publication sur GitHub
// Le dépôt est deviné d'après l'adresse de la page (propriétaire.github.io/dépôt), sinon celui du jeu.
export function guessRepo() {
  const h = location.hostname.match(/^([a-z0-9-]+)\.github\.io$/i), seg = location.pathname.split('/').filter(Boolean)[0];
  return h ? { owner: h[1], repo: seg && !/\.html$/.test(seg) ? seg : 'maree-morte', branch: 'main' } : { owner: 'joyeuxhugo39-max', repo: 'maree-morte', branch: 'main' };
}
export const PUB_PATH = 'docs/monde-studio.json';
const b64 = (s) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
const unb64 = (s) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\n/g, '')), (c) => c.charCodeAt(0)));
async function gh(cfg, token, method, url, body) {
  const r = await fetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}${url}`, { method, headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(r.status === 401 ? 'Clé GitHub refusée (expirée ou mal copiée).' : r.status === 403 ? 'Cette clé n’a pas le droit d’écrire dans le dépôt.' : r.status === 404 ? 'Dépôt ou fichier introuvable (vérifiez le propriétaire, le dépôt et la branche, et les droits de la clé).' : (j.message || `Erreur GitHub ${r.status}`)); e.status = r.status; throw e; }
  return j;
}
export const github = {
  async check(cfg, token) { const j = await gh(cfg, token, 'GET', ''); return { nom: j.full_name, ecriture: !!(j.permissions && j.permissions.push) }; },
  async published(cfg, token) { // le monde publié en ce moment (et son empreinte, pour le remplacer)
    try { const j = await gh(cfg, token, 'GET', `/contents/${PUB_PATH}?ref=${encodeURIComponent(cfg.branch)}`); return { sha: j.sha, doc: JSON.parse(unb64(j.content)) }; }
    catch (e) { if (e.status === 404) return { sha: null, doc: null }; throw e; }
  },
  async publish(cfg, token, doc, message) {
    const cur = await this.published(cfg, token);
    const body = { message, content: b64(JSON.stringify(doc, null, 1) + '\n'), branch: cfg.branch };
    if (cur.sha) body.sha = cur.sha;
    const j = await gh(cfg, token, 'PUT', `/contents/${PUB_PATH}`, body);
    return { commit: j.commit && j.commit.sha, url: j.commit && j.commit.html_url };
  },
  async history(cfg, token) { // les publications précédentes (l'historique du fichier dans le dépôt)
    const j = await gh(cfg, token, 'GET', `/commits?path=${encodeURIComponent(PUB_PATH)}&sha=${encodeURIComponent(cfg.branch)}&per_page=30`);
    return j.map((c) => ({ sha: c.sha, date: c.commit.author.date, message: c.commit.message }));
  },
  async at(cfg, token, sha) { const j = await gh(cfg, token, 'GET', `/contents/${PUB_PATH}?ref=${sha}`); return JSON.parse(unb64(j.content)); },
};
