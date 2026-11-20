// Lot 2 — le panneau développeur (« l'atelier »). Ce fichier n'est PAS dans les pages publiques : le serveur Node
// l'envoie à un compte autorisé, après le secret, et le client le charge à la volée. Il ne fait qu'envoyer des
// commandes texte, que le serveur revérifie une à une ; tout ce qu'il affiche vient du serveur.
// F9 : montrer ou cacher. Les boutons et la console passent par les mêmes commandes.
export function mount(api) {
  const { G, deps } = api;
  let cat = api.cat, lab = api.lab | 0, tab = 'labo', hist = [], hi = -1, sugg = [], si = 0, filters = {};
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const RAR = ['#5a4030', '#2f7d32', '#1e5fa8', '#7b3fb0', '#b8650a'];

  // ------------------------------------------------------------ styles
  const css = document.createElement('style');
  css.textContent = `
  #devp{position:absolute;right:12px;top:58px;width:470px;max-width:calc(100vw - 24px);height:min(760px,calc(100vh - 80px));z-index:44;display:flex;flex-direction:column;
    background:var(--parch);color:var(--ink);border:3px solid #1a0e06;border-radius:4px;box-shadow:inset 0 0 0 3px var(--wood3),inset 0 0 0 5px var(--wood1),0 10px 30px rgba(0,0,0,.55);font:13px var(--ui);user-select:text;-webkit-user-select:text}
  #devp.min{height:auto} #devp.min .dv-body,#devp.min .dv-tabs,#devp.min .dv-con,#devp.min .dv-search{display:none}
  #devp .dv-head{display:flex;align-items:center;gap:8px;padding:8px 10px 6px 12px;border-bottom:2px dashed rgba(90,58,34,.35)}
  #devp h3{font:400 22px var(--title);margin:0;color:#5a1408;flex:1}
  #devp .dv-lab{font-size:11px;padding:2px 7px;border-radius:3px;border:2px solid #3a2008;background:#6aa84f;color:#fff;font-weight:700}
  #devp .dv-lab.off{background:#a33;}
  #devp .dv-x{background:var(--wood2);color:var(--parch3);border:2px solid #1a0e06;border-radius:3px;width:24px;height:24px;cursor:pointer;font:14px var(--ui);padding:0}
  #devp .dv-search{margin:6px 10px 0}
  #devp input,#devp select{font:13px var(--ui);padding:3px 6px;border:2px solid var(--wood2);border-radius:3px;background:#fbf2da;color:var(--ink)}
  #devp .dv-search input{width:100%}
  #devp .dv-tabs{display:flex;flex-wrap:wrap;gap:3px;padding:6px 10px 4px}
  #devp .dv-tabs button,#devp .b{font:12px var(--ui);padding:2px 7px;border:2px solid var(--wood2);border-radius:3px;background:#fbf2da;color:var(--ink);cursor:pointer}
  #devp .dv-tabs button.on{background:var(--wood2);color:var(--parch3)}
  #devp .b:hover{background:#f6d26a} #devp .b.w{border-color:#8a2a1a;color:#8a2a1a} #devp .b.g{background:linear-gradient(#f6d26a,#d9a03a);font-weight:700}
  #devp .dv-body{flex:1;overflow:auto;padding:4px 10px 8px;min-height:120px}
  #devp .sec{margin:8px 0 4px;font-weight:700;color:#5a1408;font-size:12px;text-transform:uppercase;letter-spacing:.5px}
  #devp .row{display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin:3px 0}
  #devp .it{display:flex;align-items:center;gap:6px;padding:2px 4px;border-bottom:1px solid rgba(90,58,34,.18)}
  #devp .it:hover{background:rgba(242,193,74,.25)}
  #devp .it .n{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  #devp .it .id{font-size:10px;color:#7a5a40}
  #devp .it.wrap{flex-wrap:wrap} #devp .it.wrap .n{flex-basis:100%;white-space:normal}
  #devp .note{font-size:11px;color:#6a4a30;margin:2px 0 6px}
  #devp .dv-con{border-top:2px dashed rgba(90,58,34,.35);padding:6px 10px 8px;position:relative}
  #devp .dv-out{height:150px;overflow:auto;background:#1e140c;color:#f3e6c4;border:2px solid #3a2414;border-radius:3px;padding:5px 7px;font:12px/1.35 ui-monospace,Consolas,monospace;white-space:pre-wrap}
  #devp .dv-out .c{color:#f2c14a} #devp .dv-out .e{color:#ff8a7a} #devp .dv-out .o{color:#cfe8b0}
  #devp .dv-in{display:flex;gap:5px;margin-top:5px} #devp .dv-in input{flex:1;font-family:ui-monospace,Consolas,monospace}
  #devp .dv-sug{position:absolute;left:10px;right:10px;bottom:40px;background:#fbf2da;border:2px solid var(--wood2);border-radius:3px;max-height:180px;overflow:auto;display:none;z-index:2}
  #devp .dv-sug div{padding:2px 6px;cursor:pointer;font:12px ui-monospace,Consolas,monospace} #devp .dv-sug div.on,#devp .dv-sug div:hover{background:#f6d26a}
  #devp .dv-sug small{color:#7a5a40;margin-left:6px;font-family:var(--ui)}
  #dv-badge{position:absolute;left:50%;top:6px;transform:translateX(-50%);z-index:43;background:#2f6b2a;color:#fff;border:2px solid #10260e;border-radius:3px;padding:2px 10px;font:700 12px var(--ui);letter-spacing:.5px;pointer-events:none;box-shadow:0 2px 0 rgba(0,0,0,.4)}`;
  document.head.appendChild(css);

  // ------------------------------------------------------------ squelette
  const root = document.createElement('div'); root.id = 'devp';
  root.innerHTML = `<div class="dv-head"><h3>Atelier du développeur</h3><span class="dv-lab"></span><button class="dv-x" data-x="min" title="Réduire">–</button><button class="dv-x" data-x="close" title="Fermer (F9)">×</button></div>
    <div class="dv-search"><input placeholder="Recherche globale : objet, monstre, quête, lieu, scène, succès…" spellcheck="false"></div>
    <div class="dv-tabs"></div><div class="dv-body"></div>
    <div class="dv-con"><div class="dv-sug"></div><div class="dv-out"></div><div class="dv-in"><input placeholder="Console : tapez « aide » — Tab complète, ↑↓ l’historique" spellcheck="false" autocomplete="off"><button class="b g">Envoyer</button></div></div>`;
  document.body.appendChild(root);
  const $ = (s) => root.querySelector(s);
  const out = $('.dv-out'), cin = $('.dv-in input'), sugBox = $('.dv-sug'), body = $('.dv-body'), search = $('.dv-search input');
  const badge = document.createElement('div'); badge.id = 'dv-badge'; document.body.appendChild(badge);
  // ne laisser aucune touche partir vers le jeu pendant qu'on écrit dans l'atelier
  root.addEventListener('keydown', (e) => { if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') e.stopPropagation(); });

  const TABS = [['labo', 'Personnage'], ['objets', 'Objets'], ['quetes', 'Quêtes'], ['ennemis', 'Ennemis'], ['lieux', 'Téléportation'], ['eco', 'Économie'], ['navires', 'Navires'], ['monde', 'Environnement'], ['cine', 'Cinématiques'], ['journal', 'Journal']];
  $('.dv-tabs').innerHTML = TABS.map(([k, l]) => `<button data-t="${k}">${l}</button>`).join('');
  $('.dv-tabs').onclick = (e) => { const b = e.target.closest('button'); if (b) { tab = b.dataset.t; search.value = ''; render(); } };
  root.querySelector('.dv-head').onclick = (e) => { const b = e.target.closest('[data-x]'); if (!b) return; if (b.dataset.x === 'min') root.classList.toggle('min'); else toggle(false); };

  // ------------------------------------------------------------ envoyer
  let seq = 0;
  const send = (c, extra) => { print(`› ${c}`, 'c'); api.send(c, Object.assign({ id: ++seq }, extra || {})); };
  function print(txt, k) { const d = document.createElement('div'); d.className = k || 'o'; d.textContent = txt; out.appendChild(d); while (out.childNodes.length > 300) out.firstChild.remove(); out.scrollTop = out.scrollHeight; }
  body.onclick = (e) => {
    const b = e.target.closest('[data-c]'); if (!b) return;
    let c = b.dataset.c;
    c = c.replace(/\{(\w+)\}/g, (m, k) => { const el = root.querySelector(`[data-v="${k}"]`); return el ? el.value.trim() : ''; });
    send(c);
  };
  body.oninput = (e) => { const f = e.target.dataset.f; if (f) { filters[f] = e.target.value; renderList(f); } };
  body.onchange = (e) => { const f = e.target.dataset.kind; if (f != null) { filters.kind = e.target.value; renderList('lieux'); } };

  // ------------------------------------------------------------ les onglets
  const btn = (label, c, cls = '') => `<button class="b ${cls}" data-c="${esc(c)}">${esc(label)}</button>`;
  const num = (k, v, w = 60, ph = '') => `<input data-v="${k}" value="${esc(v)}" style="width:${w}px" placeholder="${esc(ph)}">`;
  const LIST = {
    objets: { src: () => cat.items, row: ([id, name, slot, r, lv]) => `<div class="it"><span class="n" style="color:${RAR[r] || RAR[0]}">${esc(name)} <span class="id">${esc(id)}${slot ? ' · ' + esc(slot) : ''} · niv. ${lv}</span></span>${btn('+1', `objet ${id} 1`)}${slot ? '' : btn('+10', `objet ${id} 10`)}${slot && slot !== 'navire' ? btn('Équiper', `equiper ${id}`) : ''}${btn('−', `retirer ${id} 1`)}${btn('ⓘ', `inspecter ${id}`)}</div>` },
    quetes: { src: () => cat.quests, row: ([id, name, lv]) => `<div class="it wrap"><span class="n">${esc(name)} <span class="id">${esc(id)} · niv. ${lv}</span></span>${btn('ⓘ', `quete info ${id}`)}${btn('Préparer', `quete preparer ${id}`)}${btn('Démarrer', `quete demarrer ${id}`)}${btn('Suivant', `quete suivante ${id}`)}${btn('Terminer', `quete terminer ${id}`)}${btn('Reset', `quete reset ${id}`, 'w')}</div>` },
    ennemis: { src: () => cat.mobs, row: ([id, name, lv, boss, sea]) => `<div class="it"><span class="n">${esc(name)} <span class="id">${esc(id)} · niv. ${lv}${boss ? ' · boss' : ''}${sea ? ' · mer' : ''}</span></span>${boss ? btn('Boss', `boss ${id} {mult}`) : btn('Invoquer', `monstre ${id} {qty} {mult}`)}${btn('ⓘ', `inspecter ${id}`)}</div>` },
    lieux: { src: () => cat.dests.filter((d) => !filters.kind || d[2] === filters.kind), row: ([id, name, kind]) => `<div class="it"><span class="n">${esc(name)} <span class="id">${esc(id)} · ${esc(kind)}</span></span>${btn('Y aller', `tp ${id}`)}</div>` },
    succes: { src: () => cat.ach, row: ([id, name]) => `<div class="it"><span class="n">${esc(name)} <span class="id">${esc(id)}</span></span>${btn('Débloquer', `succes ${id}`)}${btn('Retirer', `succes retirer ${id}`, 'w')}</div>` },
    cine: { src: () => cat.scenes, row: ([id, name]) => `<div class="it"><span class="n">${esc(name)} <span class="id">${esc(id)}</span></span>${btn('▶ Lancer', `cine ${id}`)}</div>` },
  };
  function renderList(k) {
    const box = root.querySelector(`[data-list="${k}"]`); if (!box) return;
    const q = norm(filters[k] || ''), L = LIST[k].src().filter((r) => !q || norm(r[0]).includes(q) || norm(r[1]).includes(q));
    box.innerHTML = L.slice(0, 120).map(LIST[k].row).join('') + (L.length > 120 ? `<div class="note">… ${L.length - 120} de plus : affinez la recherche.</div>` : '') + (!L.length ? '<div class="note">Rien.</div>' : '');
  }
  const listBlock = (k, ph) => `<div class="row"><input data-f="${k}" placeholder="${esc(ph)}" value="${esc(filters[k] || '')}" style="flex:1"></div><div data-list="${k}"></div>`;
  const labNote = () => (lab ? `<div class="note">Vous jouez le <b>laboratoire ${lab}</b> : sauvegarde à part, à l’écart des vrais pirates.</div>` : `<div class="note"><b>Vrai personnage.</b> Les commandes qui modifient un personnage exigent le laboratoire : il n’est jamais touché.</div>`);
  const VIEW = {
    labo: () => `${labNote()}<div class="sec">Laboratoire</div><div class="row">${btn('Labo 1', 'lab 1', 'g')}${btn('Labo 2', 'lab 2')}${btn('Labo 3', 'lab 3')}${btn('Revenir au vrai personnage', 'lab sortir')}</div>
      <div class="row">${btn('Réinitialiser ce laboratoire', 'lab reset', 'w')}<span class="note">(confirmation demandée)</span></div>
      <div class="sec">Scénarios</div><div class="row">${btn('Débutant', 'lab scenario debutant')}${btn('Aventurier', 'lab scenario aventurier')}${btn('Vétéran', 'lab scenario veteran')}${btn('Légende', 'lab scenario legende')}</div>
      <div class="sec">Niveau, Gloire, PV, énergie</div>
      <div class="row">Niveau ${num('lvl', G.me ? G.me.lvl || '' : '', 50)}${btn('Fixer', 'niveau {lvl}')} Gloire ${num('glo', '', 50)}${btn('Fixer', 'gloire {glo}')} XP ${num('xp', 1000, 70)}${btn('Donner', 'xp {xp}')}</div>
      <div class="row">${btn('PV max', 'pv max')}${btn('PV à 1', 'pv 1')}${btn('Énergie max', 'energie max')}${btn('Énergie à 0', 'energie 0')}</div>
      <div class="row">${btn('Invincible 10 min', 'invincible 600')}${btn('Plus invincible', 'invincible off')}${btn('Valeurs normales', 'normal')}${btn('Statistiques', 'stats')}</div>`,
    objets: () => `<div class="row">${btn('Vider l’inventaire', 'vider', 'w')}${btn('Tout déséquiper', 'desequiper tout')}</div>${listBlock('objets', 'Filtrer les objets (nom ou identifiant)…')}`,
    quetes: () => `<div class="note">« Préparer » termine la chaîne de prérequis sans récompense, pour tester un embranchement ou une fin. « Terminer » rend la quête avec ses récompenses.</div>
      <div class="row">Objectif n° ${num('qg', 1, 40)} de ${num('qid', '', 150, 'id de la quête')}${btn('Valider l’objectif', 'quete objectif {qid} {qg}')}${btn('Tout effacer', 'quete reset tout', 'w')}</div>${listBlock('quetes', 'Filtrer les quêtes…')}`,
    ennemis: () => `<div class="row">Quantité <select data-v="qty">${[1, 3, 5, 10, 20].map((n) => `<option>${n}</option>`).join('')}</select> PV <select data-v="mult">${['x0.5', 'x1', 'x2', 'x5'].map((n) => `<option${n === 'x1' ? ' selected' : ''}>${n}</option>`).join('')}</select>${btn('Supprimer mes invocations', 'nettoyer', 'w')}</div>${listBlock('ennemis', 'Filtrer les monstres (ou « boss »)…')}`,
    lieux: () => `<div class="row">${btn('Retour à Port-Lanterne', 'tp port', 'g')} Cases ${num('tx', '', 50, 'x')}${num('ty', '', 50, 'y')}${btn('Y aller', 'tp {tx} {ty}')}</div>
      <div class="row">Genre <select data-kind="1"><option value="">tous</option>${[...new Set(cat.dests.map((d) => d[2]))].map((k) => `<option${filters.kind === k ? ' selected' : ''}>${esc(k)}</option>`).join('')}</select></div>${listBlock('lieux', 'Filtrer les lieux…')}`,
    eco: () => `<div class="sec">Doublons</div><div class="row">${num('gold', 10000, 90)}${btn('Fixer', 'doublons {gold}')}${btn('+', 'doublons +{gold}')}${btn('−', 'doublons -{gold}')}</div>
      <div class="sec">Récompenses de quête</div><div class="row">${num('rq', '', 170, 'id de la quête')}${btn('Donner les récompenses', 'recompense {rq}')}</div>
      <div class="sec">Succès</div><div class="row">${btn('Tous les succès', 'succes tous')}<span class="note">Le jeu n’a plus de recettes d’artisanat depuis la 0.8 : tout s’achète.</span></div>${listBlock('succes', 'Filtrer les succès…')}`,
    navires: () => `<div class="row">${btn('Réparer', 'navire reparer')}${btn('Amener près de moi', 'navire ici')}${btn('Dégager', 'navire degager')}${btn('Amarrer au port', 'navire port')}</div><div class="sec">Armer un modèle au quai le plus proche</div>${cat.ships.map(([id, name]) => `<div class="it"><span class="n">${esc(name)} <span class="id">${esc(id)}</span></span>${btn('Armer', `navire ${id}`)}</div>`).join('')}`,
    monde: () => `<div class="note">Ces commandes touchent tout le serveur : si de vrais pirates sont en ligne, une confirmation est demandée.</div>
      <div class="sec">Heure</div><div class="row">${['aube', 'jour', 'midi', 'crepuscule', 'nuit', 'minuit', 'pleine-lune'].map((k) => btn(k, `temps ${k}`)).join('')} ${num('hh', '22:30', 60)}${btn('Heure précise', 'temps {hh}')}</div>
      <div class="sec">Météo</div><div class="row">${btn('Clair', 'meteo clair {wm}')}${btn('Pluie', 'meteo pluie {wm}')}${btn('Orage', 'meteo orage {wm}')} pendant ${num('wm', 30, 40)} min ${btn('Ciel normal', 'meteo auto')}</div>
      <div class="sec">Événements</div><div class="row">${cat.places.map(([id, name]) => btn(`Invasion : ${name}`, `evenement invasion ${id}`)).join('')}</div><div class="row">${btn('Éruption du volcan', 'evenement eruption')}${btn('Horde (pleine lune)', 'evenement horde')}${btn('Finir l’invasion', 'evenement fin', 'w')}</div>`,
    cine: () => `<div class="row">${btn('Passer la cinématique en cours', 'cine passer', 'w')}</div>${listBlock('cine', 'Filtrer les scènes…')}`,
    journal: () => `<div class="row">${btn('Mes 30 dernières commandes', 'historique 30', 'g')}</div><div class="note">Chaque commande est consignée sur le serveur (auteur, personnage, date, commande, résultat, erreur) ; le journal complet est dans la console d’administration.</div>`,
  };
  function render() {
    root.querySelectorAll('.dv-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.t === tab && !search.value));
    const sp = $('.dv-lab'); sp.textContent = lab ? `LABO ${lab}` : 'VRAI PERSO'; sp.classList.toggle('off', !lab);
    badge.textContent = `🧪 LABORATOIRE ${lab} — personnage de test`; badge.classList.toggle('hidden', !lab);
    if (search.value.trim()) return renderSearch();
    body.innerHTML = VIEW[tab]();
    if (tab === 'eco') renderList('succes'); else if (LIST[tab]) renderList(tab);
  }
  // ------------------------------------------------------------ recherche globale
  function renderSearch() {
    const q = norm(search.value.trim()), hit = (r) => norm(r[0]).includes(q) || norm(r[1]).includes(q);
    const part = (title, k, src) => { const L = src.filter(hit).slice(0, 12); return L.length ? `<div class="sec">${title}</div>${L.map(LIST[k].row).join('')}` : ''; };
    body.innerHTML = (part('Objets', 'objets', cat.items) + part('Monstres', 'ennemis', cat.mobs) + part('Quêtes', 'quetes', cat.quests) + part('Lieux', 'lieux', cat.dests) + part('Scènes', 'cine', cat.scenes) + part('Succès', 'succes', cat.ach)) || '<div class="note">Rien trouvé.</div>';
  }
  search.oninput = render;

  // ------------------------------------------------------------ console et autocomplétion
  const SUBS = {
    lab: ['1', '2', '3', 'sortir', 'reset', 'scenario'], quete: ['liste', 'info', 'demarrer', 'preparer', 'objectif', 'suivante', 'terminer', 'reset'],
    navire: ['liste', 'reparer', 'ici', 'degager', 'port'], cine: ['liste', 'passer', 'oublier'], temps: ['aube', 'jour', 'midi', 'crepuscule', 'nuit', 'minuit', 'pleine-lune'],
    meteo: ['clair', 'pluie', 'orage', 'auto'], evenement: ['invasion', 'eruption', 'horde', 'fin'], succes: ['tous', 'retirer'], desequiper: ['weapon', 'gun', 'hat', 'body', 'boots', 'trinket', 'outfit', 'mount', 'tout'],
    invincible: ['600', 'off'], pv: ['max'], energie: ['max'], tp: ['port', 'pnj'],
  };
  const canon = (w) => { const c = cat.cmds.find((x) => x[0] === w || x[1].includes(w)); return c ? c[0] : w; };
  function suggestions(line) {
    const parts = line.split(/\s+/), last = norm(parts[parts.length - 1]);
    const pick = (L) => L.filter((s) => norm(s[0]).startsWith(last) || (last.length > 1 && norm(s[1] || '').includes(last))).slice(0, 10);
    if (parts.length <= 1) return pick(cat.cmds.flatMap((c) => [[c[0], c[2]], ...c[1].map((a) => [a, '→ ' + c[0]])]));
    const c = canon(norm(parts[0])), prev = norm(parts[parts.length - 2]);
    const subs = (SUBS[c] || []).map((s) => [s, '']);
    if (c === 'lab' && prev === 'scenario') return pick(['debutant', 'aventurier', 'veteran', 'legende'].map((s) => [s, '']));
    if (c === 'evenement' && prev === 'invasion') return pick(cat.places);
    if (['objet', 'retirer', 'equiper', 'inspecter'].includes(c)) return pick(cat.items.concat(c === 'inspecter' ? cat.mobs : []));
    if (c === 'monstre' || c === 'boss') return pick(c === 'boss' ? cat.mobs.filter((m) => m[3]) : cat.mobs);
    if (c === 'quete' || c === 'recompense') return parts.length === 2 && c === 'quete' ? pick(subs) : pick(cat.quests);
    if (c === 'tp') return pick(subs.concat(cat.dests));
    if (c === 'cine') return pick(subs.concat(cat.scenes));
    if (c === 'succes') return pick(subs.concat(cat.ach));
    if (c === 'navire') return pick(subs.concat(cat.ships));
    if (c === 'aide') return pick(cat.cmds.map((x) => [x[0], x[2]]));
    return pick(subs);
  }
  function showSug() {
    sugg = cin.value.trim() || cin.value.endsWith(' ') ? suggestions(cin.value) : []; si = 0;
    sugBox.innerHTML = sugg.map((s, i) => `<div data-i="${i}" class="${i === si ? 'on' : ''}">${esc(s[0])}<small>${esc(s[1] || '')}</small></div>`).join('');
    sugBox.style.display = sugg.length ? 'block' : 'none';
  }
  function accept(i) { const s = sugg[i]; if (!s) return; const parts = cin.value.split(/\s+/); parts[parts.length - 1] = s[0]; cin.value = parts.join(' ') + ' '; showSug(); cin.focus(); }
  sugBox.onmousedown = (e) => { const d = e.target.closest('[data-i]'); if (d) { e.preventDefault(); accept(+d.dataset.i); } };
  cin.oninput = showSug;
  cin.onblur = () => setTimeout(() => { sugBox.style.display = 'none'; }, 120);
  cin.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Tab') { e.preventDefault(); if (sugg.length) accept(si); return; }
    if (e.key === 'ArrowDown' && sugg.length && sugBox.style.display !== 'none') { e.preventDefault(); si = (si + 1) % sugg.length; showSugSel(); return; }
    if (e.key === 'ArrowUp' && sugg.length && sugBox.style.display !== 'none') { e.preventDefault(); si = (si - 1 + sugg.length) % sugg.length; showSugSel(); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); if (hist.length) { hi = hi < 0 ? hist.length - 1 : Math.max(0, hi - 1); cin.value = hist[hi]; } return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); if (hi >= 0) { hi++; cin.value = hi < hist.length ? hist[hi] : ''; if (hi >= hist.length) hi = -1; } return; }
    if (e.key === 'Escape') { sugBox.style.display = 'none'; cin.blur(); return; }
    if (e.key === 'Enter') { e.preventDefault(); submit(); }
  });
  function showSugSel() { sugBox.querySelectorAll('div').forEach((d, i) => d.classList.toggle('on', i === si)); const el = sugBox.children[si]; if (el) el.scrollIntoView({ block: 'nearest' }); }
  function submit() { const c = cin.value.trim(); if (!c) return; hist.push(c); if (hist.length > 50) hist.shift(); hi = -1; cin.value = ''; sugBox.style.display = 'none'; send(c); }
  $('.dv-in button').onclick = submit;

  // ------------------------------------------------------------ F9
  const onKey = (e) => { if (e.code === 'F9') { e.preventDefault(); toggle(); } };
  window.addEventListener('keydown', onKey);
  function toggle(v) { const show = v == null ? root.classList.contains('hidden') : v; root.classList.toggle('hidden', !show); if (show) render(); }

  // ------------------------------------------------------------ messages du serveur
  function onMessage(m) {
    if (m.a === 'res') {
      if (m.need) { print(m.err, 'e'); G.ui.confirm(esc(m.err).replace(/\n/g, '<br>'), () => send(m.c, { confirm: 1 })); return; }
      if (m.ok) print(m.out || 'ok'); else print(m.err || 'Erreur.', 'e');
      if (m.lab != null && (m.lab | 0) !== lab) { lab = m.lab | 0; render(); }
      if (root.classList.contains('hidden')) G.ui.toast(String(m.ok ? m.out : m.err).split('\n')[0].slice(0, 120), m.ok ? 'info' : 'warn');
    } else if (m.a === 'cine') playCine(m);
  }
  function playCine(m) {
    const now = performance.now() / 1000;
    if (m.skip) { if (G.cinema && G.cinema.locked()) { if (G.scene && G.scene.on) G.scene.abort(); G.cinema.skip(); return; } if (G.scene && G.scene.on) G.scene.abort(); if (G.cine) deps.endCine(G); return; }
    const c = m.c, P = G.player; if (!c || !P) return;
    if (c.path) { // une scène de quête : les répliques sont dans les données du jeu
      let steps = deps.QUESTS[c.q]; for (const k of c.path) steps = steps && steps[k];
      if (!Array.isArray(steps)) return print('Scène introuvable dans cette version du client.', 'e');
      toggle(false); G.scene.play(c.npc, steps, null);
    } else if (c.kind === 'boss') deps.bossIntro(G, { x: P.x + 70, y: P.y - 10 }, c.type, now);
    else if (c.kind === 'down') deps.bossDown(G, c.type, P.x + 70, P.y - 10, now);
    else if (c.kind === 'kraken') deps.krakenIntro(G, { sx: P.x, sy: P.y, x: P.x + 140, y: P.y - 60 }, now);
    else if (c.kind === 'krakendown') deps.krakenDown(G, P.x + 140, P.y - 60, now);
  }
  function onWelcome(m) { lab = m.lab | 0; render(); }
  function update(m) { if (m.cat) cat = m.cat; lab = m.lab | 0; render(); }
  function unmount() { window.removeEventListener('keydown', onKey); root.remove(); badge.remove(); css.remove(); }
  print('Atelier ouvert. Tapez « aide », ou utilisez les onglets. F9 pour montrer ou cacher.', 'o');
  render();
  return { onMessage, onWelcome, update, toggle, unmount };
}
