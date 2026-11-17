// 1.0 : la vie en société — canaux de discussion, messages privés, amis, blocages, modération,
// groupes (partage de l'expérience et des objectifs), équipages (pavillon, rangs) et échanges sécurisés.
// Ces méthodes sont ajoutées au prototype de Game (voir la fin de game.js) : `this` est la partie.
import { ITEMS, isStackable, STACK_MAX } from '../shared/data/items.js';
import { TILE } from '../shared/constants.js';

const GROUP_MAX = 5, CREW_PRICE = 1000, CREW_NAME = /^[\p{L}0-9 '’-]{3,24}$/u, CREW_TAG = /^[\p{L}0-9]{2,4}$/u;
const LOCAL_RANGE = 26 * TILE;
// les injures haineuses sont masquées pour tout le monde ; le reste se règle dans les réglages de chacun
const SLURS = /\b(n[eè]gr\w*|bougnoul\w*|youpin\w*|p[ée]d[ée]s?|tapettes?|bicots?|niakou\w*)\b/giu;
export const CHANNELS = { local: 'Local', global: 'Global', groupe: 'Groupe', equipage: 'Équipage' };

export const social = {
  socialInit() {
    this.groups = new Map(); // id -> { id, leader, members: [pid] }
    this.crews = new Map(); // id -> { id, name, tag, flag, members: { key: rang }, created }
    this.trades = new Map(); // pid -> échange en cours
    this.mutes = {};
    this.nextGroup = 1;
    if (this.storage && this.storage.loadMeta) {
      Promise.resolve(this.storage.loadMeta('crews')).then((c) => { if (Array.isArray(c)) for (const cr of c) this.crews.set(cr.id, cr); }).catch(() => {});
      Promise.resolve(this.storage.loadMeta('mutes')).then((m) => { if (m) this.mutes = m; }).catch(() => {});
    }
  },
  storeCrews() { if (this.storage.saveMeta) Promise.resolve(this.storage.saveMeta('crews', [...this.crews.values()])).catch(() => {}); },
  byName(name) { const k = String(name || '').trim().toLowerCase(); for (const q of this.players.values()) if (q.key === k) return q; return null; },
  blocks(a, b) { return !!(a.blocked && a.blocked.has(b.key)); }, // a ne veut plus entendre b
  sysTo(p, m) { this.send(p, { t: 'chat', from: null, kind: 'sys', ch: 'sys', m }); },
  socialLoad(p, d) {
    p.friends = new Set(d && Array.isArray(d.friends) ? d.friends.filter((x) => typeof x === 'string').slice(0, 100) : []);
    p.blocked = new Set(d && Array.isArray(d.blocked) ? d.blocked.filter((x) => typeof x === 'string').slice(0, 200) : []);
    p.tradeLog = d && Array.isArray(d.tradeLog) ? d.tradeLog.slice(-20) : [];
    p.crew = null; for (const c of this.crews.values()) if (c.members[p.key]) p.crew = c.id;
  },
  socialSave(p) { return { friends: [...(p.friends || [])], blocked: [...(p.blocked || [])], tradeLog: p.tradeLog || [] }; },
  socialState(p) {
    const g = p.group ? this.groups.get(p.group) : null, c = p.crew ? this.crews.get(p.crew) : null;
    return {
      t: 'soc',
      friends: [...p.friends].map((k) => { const q = this.byName(k); return [q ? q.name : k, !!q, q ? q.level : 0]; }), blocked: [...p.blocked], log: (p.tradeLog || []).slice(-10),
      group: g ? { leader: g.leader, members: g.members.map((id) => this.players.get(id)).filter(Boolean).map((q) => ({ id: q.id, name: q.name, lvl: q.level, hp: Math.ceil(q.hp), maxHp: q.stats.maxHp, dead: !!q.dead })) } : null,
      crew: c ? { id: c.id, name: c.name, tag: c.tag, flag: c.flag, rank: c.members[p.key], members: Object.entries(c.members).map(([k, r]) => { const q = this.byName(k); return [q ? q.name : k, r, !!q, q ? q.level : 0]; }) } : null,
    };
  },
  pushSocial(p) { if (p && this.players.has(p.id)) this.send(p, this.socialState(p)); },
  // ------------------------------------------------------------ discussion
  chatChannel(p, msg, ch) {
    if ((this.mutes[p.key] || 0) > Date.now()) return this.toast(p, `Vous êtes réduit au silence jusqu'à ${new Date(this.mutes[p.key]).toLocaleTimeString('fr-FR')}.`, 'warn');
    msg = msg.replace(SLURS, (w) => '*'.repeat(w.length));
    if (p.lastMsg === msg && this.time - (p.lastMsgAt || 0) < 8) return this.toast(p, 'Message répété.', 'warn');
    p.lastMsg = msg; p.lastMsgAt = this.time;
    const m = { t: 'chat', from: p.name, lvl: p.level, m: msg, kind: 'chat', ch, pid: p.id, crew: p.crew ? (this.crews.get(p.crew) || {}).tag : undefined };
    let to;
    if (ch === 'global') { to = [...this.players.values()]; this.chatLog = this.chatLog || []; this.chatLog.push(m); if (this.chatLog.length > 40) this.chatLog.shift(); }
    else if (ch === 'groupe') { const g = p.group && this.groups.get(p.group); if (!g) return this.toast(p, 'Vous n’êtes dans aucun groupe.', 'warn'); to = g.members.map((id) => this.players.get(id)).filter(Boolean); }
    else if (ch === 'equipage') { if (!p.crew) return this.toast(p, 'Vous n’avez pas d’équipage.', 'warn'); to = [...this.players.values()].filter((q) => q.crew === p.crew); }
    else to = [...this.players.values()].filter((q) => q.room === p.room && Math.hypot(q.x - p.x, q.y - p.y) < LOCAL_RANGE);
    for (const q of to) if (!this.blocks(q, p)) this.send(q, m);
    this.audit('chat', { who: p.key, ch, m: msg.slice(0, 160) });
  },
  privateMsg(p, name, msg) {
    const q = this.byName(name);
    if (!q) return this.toast(p, `${name} n’est pas en mer en ce moment.`, 'warn');
    if (q === p) return;
    msg = msg.replace(SLURS, (w) => '*'.repeat(w.length)).slice(0, 160);
    if (!this.blocks(q, p)) { this.send(q, { t: 'chat', from: p.name, lvl: p.level, m: msg, kind: 'mp', ch: 'mp', pid: p.id }); q.replyTo = p.key; }
    this.send(p, { t: 'chat', from: '→ ' + q.name, lvl: q.level, m: msg, kind: 'mp', ch: 'mp', pid: q.id });
    this.audit('mp', { who: p.key, to: q.key, m: msg });
  },
  // ------------------------------------------------------------ amis et blocages
  socAction(p, a, name) {
    const q = this.byName(name), key = String(name || '').trim().toLowerCase();
    switch (a) {
      case 'friend': if (!key || key === p.key) return; if (p.friends.size >= 100) return this.toast(p, 'Cent amis, c’est déjà un équipage !', 'warn'); p.friends.add(key); this.toast(p, `${name} ajouté à vos amis.`, 'info'); break;
      case 'unfriend': p.friends.delete(key); break;
      case 'block': if (!key || key === p.key) return; p.blocked.add(key); p.friends.delete(key); this.toast(p, `Vous n’entendrez plus ${name}.`, 'info'); break;
      case 'unblock': p.blocked.delete(key); break;
      case 'invite': return this.groupInvite(p, q);
      case 'accept': return this.groupAccept(p, q);
      case 'decline': if (q) this.toast(q, `${p.name} décline votre invitation.`, 'info'); return;
      case 'leave': return this.groupLeave(p);
      case 'kick': { const g = p.group && this.groups.get(p.group); if (g && g.leader === p.id && q && q.group === g.id) this.groupLeave(q, 'Vous avez été retiré du groupe.'); return; }
      case 'join': return this.joinMember(p, q);
      default: return;
    }
    this.pushSocial(p);
  },
  // ------------------------------------------------------------ groupes
  groupInvite(p, q) {
    if (!q || q === p) return this.toast(p, 'Pirate introuvable.', 'warn');
    if (this.blocks(q, p)) return this.toast(p, `${q.name} ne souhaite pas être dérangé.`, 'warn');
    const g = p.group && this.groups.get(p.group);
    if (g && g.leader !== p.id) return this.toast(p, 'Seul le chef du groupe invite.', 'warn');
    if (g && g.members.length >= GROUP_MAX) return this.toast(p, `Un groupe compte ${GROUP_MAX} pirates au plus.`, 'warn');
    if (q.group) return this.toast(p, `${q.name} est déjà dans un groupe.`, 'warn');
    q.groupInvite = { from: p.id, until: this.time + 60 };
    this.send(q, { t: 'ask', kind: 'groupe', from: p.name, fromId: p.id });
    this.toast(p, `Invitation envoyée à ${q.name}.`, 'info');
  },
  groupAccept(p, q) {
    const inv = p.groupInvite;
    if (!inv || inv.until < this.time || !q || inv.from !== q.id) return this.toast(p, 'Cette invitation a expiré.', 'warn');
    p.groupInvite = null;
    let g = q.group && this.groups.get(q.group);
    if (!g) { g = { id: this.nextGroup++, leader: q.id, members: [q.id] }; this.groups.set(g.id, g); q.group = g.id; }
    if (g.members.length >= GROUP_MAX) return this.toast(p, 'Le groupe est complet.', 'warn');
    if (p.group) this.groupLeave(p);
    g.members.push(p.id); p.group = g.id;
    for (const id of g.members) { const m = this.players.get(id); if (m) { this.toast(m, `${p.name} rejoint le groupe.`, 'quest'); this.pushSocial(m); } }
  },
  groupLeave(p, why) {
    const g = p.group && this.groups.get(p.group);
    p.group = null;
    if (!g) return;
    g.members = g.members.filter((id) => id !== p.id);
    if (why) this.toast(p, why, 'info');
    this.pushSocial(p);
    if (g.members.length <= 1) { for (const id of g.members) { const m = this.players.get(id); if (m) { m.group = null; this.toast(m, 'Le groupe est dissous.', 'info'); this.pushSocial(m); } } this.groups.delete(g.id); return; }
    if (g.leader === p.id) g.leader = g.members[0];
    for (const id of g.members) { const m = this.players.get(id); if (m) { this.toast(m, `${p.name} quitte le groupe.`, 'info'); this.pushSocial(m); } }
  },
  groupOf(p) { const g = p.group && this.groups.get(p.group); return g ? g.members.map((id) => this.players.get(id)).filter(Boolean) : [p]; },
  // les membres du groupe proches d'un monstre abattu partagent l'expérience et les objectifs ; bonus de groupe
  expandTags(m) {
    const out = new Map(m.tags), extra = new Map();
    for (const pid of m.tags.keys()) { const p = this.players.get(pid); if (!p || !p.group) continue; for (const q of this.groupOf(p)) if (!out.has(q.id) && q.room === m.room && Math.hypot(q.x - m.x, q.y - m.y) < 700) out.set(q.id, 0.0001); }
    for (const pid of out.keys()) { const p = this.players.get(pid); if (!p || !p.group) continue; const n = this.groupOf(p).filter((q) => out.has(q.id)).length; if (n > 1) extra.set(pid, 1 + 0.1 * (n - 1)); }
    m.gbonus = extra;
    return out;
  },
  // rejoindre un membre du groupe : depuis une ville, une fois toutes les cinq minutes
  joinMember(p, q) {
    if (!q || !p.group || q.group !== p.group) return this.toast(p, 'Vous ne pouvez rejoindre qu’un membre de votre groupe.', 'warn');
    if (!this.isSafeAt(p)) return this.toast(p, 'Rejoignez votre groupe depuis une ville (zone sûre).', 'warn');
    if (p.boat || q.boat || q.room >= 0 || q.dead) return this.toast(p, `${q.name} est injoignable pour le moment (en mer, à l’intérieur ou à terre).`, 'warn');
    if ((p.joinAt || 0) > this.time) return this.toast(p, `Encore ${Math.ceil(p.joinAt - this.time)} s avant de pouvoir rejoindre.`, 'warn');
    p.joinAt = this.time + 300;
    this.teleport(p, q.x + 16, q.y + 6, { travel: 'join' });
    this.toast(q, `${p.name} vous rejoint.`, 'info');
  },
  // ------------------------------------------------------------ équipages
  crewAction(p, a, m) {
    const c = p.crew ? this.crews.get(p.crew) : null, rank = c ? c.members[p.key] : null;
    switch (a) {
      case 'create': {
        if (c) return this.toast(p, 'Vous avez déjà un équipage.', 'warn');
        const name = String(m.name || '').trim(), tag = String(m.tag || '').trim().toUpperCase();
        if (!CREW_NAME.test(name) || !CREW_TAG.test(tag)) return this.toast(p, 'Nom : 3 à 24 lettres ; sigle : 2 à 4 lettres.', 'warn');
        if ([...this.crews.values()].some((x) => x.name.toLowerCase() === name.toLowerCase() || x.tag === tag)) return this.toast(p, 'Ce nom ou ce sigle est déjà pris.', 'warn');
        if (p.gold < CREW_PRICE) return this.toast(p, `Fonder un équipage coûte ${CREW_PRICE} doublons.`, 'warn');
        p.gold -= CREW_PRICE; p.dirtyMe = true;
        const id = 'c' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
        this.crews.set(id, { id, name, tag, flag: { c1: '#141418', c2: '#f3f0e2', sym: 'crane' }, members: { [p.key]: 'capitaine' }, created: Date.now() });
        p.crew = id; this.storeCrews(); p.lookVer++;
        this.audit('equipage-creation', { who: p.key, name, tag });
        this.toast(p, `L’équipage « ${name} » [${tag}] est fondé. Vous en êtes le capitaine.`, 'quest');
        break;
      }
      case 'invite': {
        if (!c || rank === 'matelot') return this.toast(p, 'Seuls le capitaine et les officiers recrutent.', 'warn');
        const q = this.byName(m.name); if (!q || q.crew) return this.toast(p, q ? `${q.name} a déjà un équipage.` : 'Pirate introuvable.', 'warn');
        if (this.blocks(q, p)) return;
        q.crewInvite = { id: c.id, until: this.time + 120 };
        this.send(q, { t: 'ask', kind: 'equipage', from: p.name, crew: c.name, tag: c.tag });
        return this.toast(p, `Invitation envoyée à ${q.name}.`, 'info');
      }
      case 'accept': {
        const inv = p.crewInvite, cr = inv && this.crews.get(inv.id);
        if (!cr || inv.until < this.time || c) return this.toast(p, 'Cette invitation a expiré.', 'warn');
        cr.members[p.key] = 'matelot'; p.crew = cr.id; p.crewInvite = null; p.lookVer++; this.storeCrews();
        for (const q of this.players.values()) if (q.crew === cr.id) { this.toast(q, `${p.name} rejoint l’équipage !`, 'quest'); this.pushSocial(q); }
        return;
      }
      case 'leave': {
        if (!c) return;
        delete c.members[p.key]; p.crew = null; p.lookVer++;
        if (!Object.keys(c.members).length) this.crews.delete(c.id);
        else if (rank === 'capitaine') { const next = Object.entries(c.members).sort((x, y) => (y[1] === 'officier') - (x[1] === 'officier'))[0]; if (next) c.members[next[0]] = 'capitaine'; }
        this.storeCrews(); this.pushSocial(p);
        for (const q of this.players.values()) if (q.crew === c.id) { this.toast(q, `${p.name} quitte l’équipage.`, 'info'); this.pushSocial(q); }
        return;
      }
      case 'kick': case 'promote': case 'demote': {
        if (!c || rank !== 'capitaine') return this.toast(p, 'Réservé au capitaine.', 'warn');
        const key = String(m.name || '').toLowerCase(); if (!c.members[key] || key === p.key) return;
        if (a === 'kick') { delete c.members[key]; const q = this.byName(key); if (q) { q.crew = null; q.lookVer++; this.toast(q, `Vous avez été débarqué de l’équipage « ${c.name} ».`, 'warn'); this.pushSocial(q); } }
        else c.members[key] = a === 'promote' ? 'officier' : 'matelot';
        this.storeCrews();
        for (const q of this.players.values()) if (q.crew === c.id) this.pushSocial(q);
        return;
      }
      case 'flag': {
        if (!c || rank !== 'capitaine') return this.toast(p, 'Réservé au capitaine.', 'warn');
        const col = (v, d) => (/^#[0-9a-f]{6}$/i.test(String(v)) ? String(v) : d);
        c.flag = { c1: col(m.c1, c.flag.c1), c2: col(m.c2, c.flag.c2), sym: ['crane', 'sabres', 'ancre', 'coeur', 'etoile', 'sablier'].includes(m.sym) ? m.sym : c.flag.sym };
        this.storeCrews();
        for (const q of this.players.values()) if (q.crew === c.id) { q.lookVer++; this.pushSocial(q); }
        return this.toast(p, 'Le pavillon de l’équipage est hissé.', 'quest');
      }
      default: return;
    }
    this.pushSocial(p);
  },
  // ------------------------------------------------------------ échanges sécurisés
  // 1 proposer, 2 accepter, 3 garnir, 4 valider (toute modification annule les validations), 5 confirmer, 6 le serveur vérifie et échange
  tradeAction(p, a, m) {
    const tr = this.trades.get(p.id);
    const other = (t) => this.players.get(t.a === p.id ? t.b : t.a);
    const mine = (t) => (t.a === p.id ? t.oa : t.ob);
    switch (a) {
      case 'ask': {
        const q = this.byName(m.name);
        if (!q || q === p || q.dead || p.dead) return this.toast(p, 'Pirate introuvable.', 'warn');
        if (this.blocks(q, p)) return this.toast(p, `${q.name} ne souhaite pas commercer avec vous.`, 'warn');
        if (this.trades.has(p.id) || this.trades.has(q.id)) return this.toast(p, 'Un échange est déjà en cours.', 'warn');
        if (q.room !== p.room || Math.hypot(q.x - p.x, q.y - p.y) > 120) return this.toast(p, 'Approchez-vous pour échanger.', 'warn');
        q.tradeAsk = { from: p.id, until: this.time + 45 };
        this.send(q, { t: 'ask', kind: 'echange', from: p.name, fromId: p.id });
        return this.toast(p, `Proposition d’échange envoyée à ${q.name}.`, 'info');
      }
      case 'accept': {
        const ask = p.tradeAsk, q = ask && this.players.get(ask.from);
        if (!ask || ask.until < this.time || !q || this.trades.has(p.id) || this.trades.has(q.id)) return this.toast(p, 'Cette proposition a expiré.', 'warn');
        if (q.room !== p.room || Math.hypot(q.x - p.x, q.y - p.y) > 120) return this.toast(p, 'Vous êtes trop loin l’un de l’autre.', 'warn');
        p.tradeAsk = null;
        const t = { a: q.id, b: p.id, oa: { items: [], gold: 0 }, ob: { items: [], gold: 0 }, ready: {}, confirm: {}, rev: 0 };
        this.trades.set(q.id, t); this.trades.set(p.id, t);
        return this.pushTrade(t);
      }
      case 'decline': { const q = p.tradeAsk && this.players.get(p.tradeAsk.from); p.tradeAsk = null; if (q) this.toast(q, `${p.name} décline l’échange.`, 'info'); return; }
      case 'offer': case 'remove': case 'gold': {
        if (!tr) return;
        const o = mine(tr);
        if (a === 'gold') o.gold = Math.max(0, Math.min(p.gold, Math.floor(+m.gold || 0)));
        else if (a === 'remove') o.items = o.items.filter((it) => it.slot !== (m.slot | 0));
        else {
          const s = p.inv[m.slot | 0]; if (!s) return;
          const it = ITEMS[s.id];
          if (it.quest) return this.toast(p, 'Un objet de quête ne s’échange pas.', 'warn');
          if (this.boatInUse(p, s.id)) return this.toast(p, 'Vous êtes à bord de ce navire.', 'warn');
          if (o.items.length >= 8 && !o.items.some((x) => x.slot === (m.slot | 0))) return this.toast(p, 'Huit objets au plus par échange.', 'warn');
          const n = Math.max(1, Math.min(s.n, m.n | 0 || s.n));
          o.items = o.items.filter((x) => x.slot !== (m.slot | 0)); o.items.push({ slot: m.slot | 0, id: s.id, n });
        }
        tr.ready = {}; tr.confirm = {}; tr.rev++; // toute modification annule les validations
        return this.pushTrade(tr);
      }
      case 'ready': if (!tr) return; tr.ready[p.id] = tr.rev; return this.pushTrade(tr);
      case 'confirm': {
        if (!tr || tr.ready[tr.a] !== tr.rev || tr.ready[tr.b] !== tr.rev) return;
        tr.confirm[p.id] = tr.rev;
        if (tr.confirm[tr.a] === tr.rev && tr.confirm[tr.b] === tr.rev) return this.tradeExecute(tr);
        return this.pushTrade(tr);
      }
      case 'cancel': if (tr) this.tradeCancel(tr, `${p.name} annule l’échange.`); return;
      default:
    }
  },
  pushTrade(t) {
    const A = this.players.get(t.a), B = this.players.get(t.b);
    const view = (o) => ({ items: o.items.map((x) => ({ slot: x.slot, id: x.id, n: x.n })), gold: o.gold });
    for (const [p, q, mine, theirs] of [[A, B, t.oa, t.ob], [B, A, t.ob, t.oa]]) if (p && q) this.send(p, { t: 'trade', with: q.name, mine: view(mine), theirs: view(theirs), ready: [!!(t.ready[p.id] === t.rev), !!(t.ready[q.id] === t.rev)], confirm: [!!(t.confirm[p.id] === t.rev), !!(t.confirm[q.id] === t.rev)] });
  },
  tradeCancel(t, why) {
    this.trades.delete(t.a); this.trades.delete(t.b);
    for (const id of [t.a, t.b]) { const p = this.players.get(id); if (p) { this.send(p, { t: 'trade', closed: 1 }); if (why) this.toast(p, why, 'info'); } }
  },
  // vérifie tout, puis échange d'un seul coup ; au moindre écart, rien ne bouge
  tradeExecute(t) {
    const A = this.players.get(t.a), B = this.players.get(t.b);
    if (!A || !B || A.dead || B.dead || A.room !== B.room || Math.hypot(A.x - B.x, A.y - B.y) > 160) return this.tradeCancel(t, 'Échange annulé : les deux pirates doivent rester proches.');
    const has = (p, o) => p.gold >= o.gold && o.items.every((x) => p.inv[x.slot] && p.inv[x.slot].id === x.id && p.inv[x.slot].n >= x.n);
    if (!has(A, t.oa) || !has(B, t.ob)) return this.tradeCancel(t, 'Échange annulé : un objet ou des doublons ont bougé entre-temps.');
    // simulation : chacun a-t-il la place de recevoir ?
    const fits = (p, give, get) => {
      const inv = p.inv.map((s) => (s ? { ...s } : null));
      for (const x of give.items) { inv[x.slot].n -= x.n; if (inv[x.slot].n <= 0) inv[x.slot] = null; }
      for (const x of get.items) {
        let n = x.n;
        if (isStackable(x.id)) for (const s of inv) if (s && s.id === x.id && s.n < STACK_MAX) { const k = Math.min(n, STACK_MAX - s.n); s.n += k; n -= k; if (!n) break; }
        while (n > 0) { const f = inv.indexOf(null); if (f < 0) return false; const k = isStackable(x.id) ? Math.min(n, STACK_MAX) : 1; inv[f] = { id: x.id, n: k }; n -= k; }
      }
      return true;
    };
    if (!fits(A, t.oa, t.ob) || !fits(B, t.ob, t.oa)) return this.tradeCancel(t, 'Échange annulé : un sac est trop plein.');
    const take = (p, o) => { for (const x of o.items) { p.inv[x.slot].n -= x.n; if (p.inv[x.slot].n <= 0) p.inv[x.slot] = null; } p.gold -= o.gold; };
    take(A, t.oa); take(B, t.ob);
    for (const x of t.oa.items) this.addItem(B, x.id, x.n);
    for (const x of t.ob.items) this.addItem(A, x.id, x.n);
    A.gold += t.ob.gold; B.gold += t.oa.gold;
    for (const p of [A, B]) { p.dirtyInv = true; p.dirtyMe = true; p.dirtyQ = true; this.recalc(p); }
    const sum = (o) => o.items.map((x) => `${x.n}× ${ITEMS[x.id].name}`).concat(o.gold ? [`${o.gold} doublons`] : []).join(', ') || 'rien';
    const when = Date.now();
    A.tradeLog.push({ at: when, with: B.name, gave: sum(t.oa), got: sum(t.ob) }); B.tradeLog.push({ at: when, with: A.name, gave: sum(t.ob), got: sum(t.oa) });
    A.tradeLog = A.tradeLog.slice(-20); B.tradeLog = B.tradeLog.slice(-20);
    this.audit('echange', { who: A.key, to: B.key, gave: t.oa, got: t.ob });
    this.trades.delete(t.a); this.trades.delete(t.b);
    for (const [p, q] of [[A, B], [B, A]]) { this.send(p, { t: 'trade', closed: 1, done: 1 }); this.toast(p, `Échange conclu avec ${q.name}.`, 'quest'); this.save(p); this.pushSocial(p); }
  },
  // un pirate s'en va : ses échanges sont annulés (rien n'a bougé), il quitte son groupe
  socialLogout(p) {
    const tr = this.trades.get(p.id); if (tr) this.tradeCancel(tr, `${p.name} est parti : échange annulé.`);
    if (p.group) this.groupLeave(p);
    for (const q of this.players.values()) if (q !== p && q.friends && q.friends.has(p.key)) this.toast(q, `${p.name} a quitté l’archipel.`, 'info');
  },
  socialLogin(p) {
    for (const q of this.players.values()) if (q !== p && q.friends && q.friends.has(p.key)) { this.toast(q, `Votre ami ${p.name} est en mer.`, 'info'); this.pushSocial(q); }
    this.pushSocial(p);
  },
  // les cadres du groupe : les PV des membres, deux fois par seconde
  socialTick() {
    if (this.tickCount % 10) return;
    for (const g of this.groups.values()) for (const id of g.members) { const p = this.players.get(id); if (p) this.send(p, { t: 'grp', m: g.members.map((mid) => this.players.get(mid)).filter(Boolean).map((q) => [q.id, Math.ceil(q.hp), q.stats.maxHp, q.dead ? 1 : 0, q.level, Math.round(q.x), Math.round(q.y), q.room]) }); }
  },
};
