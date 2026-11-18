// Lot 2 : le crochet des outils développeur. Rien ici n'accorde le moindre droit : le serveur Node décide de tout,
// revérifie chaque commande, et n'envoie le panneau (absent de cette page) qu'à un compte autorisé qui a donné le
// secret. Partout ailleurs (solo, page GitHub, page claude.ai), le moteur répond simplement « Accès refusé ».
const KEY = 'mm_dev';
export function devToken() {
  try { const d = JSON.parse(sessionStorage.getItem(KEY) || 'null'); return d && d.until > Date.now() ? d.tok : null; } catch (e) { return null; }
}
function setTok(d) { try { if (d) sessionStorage.setItem(KEY, JSON.stringify(d)); else sessionStorage.removeItem(KEY); } catch (e) { /* stockage indisponible */ } }

export function devHook(G, deps) {
  const D = { panel: null };
  G.dev = D;
  // « /dev » dans la discussion : jamais envoyé comme message
  D.start = () => { const tok = devToken(); if (tok && D.panel) return D.panel.toggle(true); G.send(tok ? { t: 'dev', a: 'panel', tok } : { t: 'dev', a: 'hello' }); };
  D.onMessage = async (m) => {
    switch (m.a) {
      case 'refus': if (devToken()) setTok(null); G.ui.toast(m.msg || 'Accès refusé.', 'warn'); break;
      case 'ask': askSecret(G); break;
      case 'ok': setTok({ tok: m.tok, until: m.until }); G.send({ t: 'dev', a: 'panel', tok: m.tok }); break;
      case 'panel': await mount(G, D, m, deps); break;
      case 'bye': setTok(null); if (D.panel) { D.panel.unmount(); D.panel = null; } G.ui.toast('Session développeur fermée.', 'info'); break;
      default:
        if (D.panel) D.panel.onMessage(m);
        else if (m.a === 'res') { // à l'accueil (réinitialisation du laboratoire) : la confirmation se fait sur place
          const row = document.getElementById('lg-lab');
          if (m.need && row) {
            row.innerHTML = `<span>${esc(m.err)}</span><button class="chip" id="lg-lab-yes">Confirmer</button><button class="chip" id="lg-lab-no">Annuler</button>`;
            document.getElementById('lg-lab-yes').onclick = () => G.send({ t: 'dev', a: 'labreset', tok: devToken(), slot: D.resetSlot || 1, confirm: 1 });
            document.getElementById('lg-lab-no').onclick = () => { row.remove(); D.loginScreen(); };
          } else { G.ui.toast(m.ok ? m.out : m.err, m.ok ? 'quest' : 'warn'); if (row) { row.remove(); D.loginScreen(); } }
        }
    }
  };
  D.onWelcome = (m) => { G.labSlot = m.lab || 0; if (D.panel) D.panel.onWelcome(m); else if (devToken() && m.lab) G.send({ t: 'dev', a: 'panel', tok: devToken() }); };
  // à l'accueil, seulement si cet onglet a déjà ouvert une session développeur valable
  D.loginScreen = () => {
    const box = document.getElementById('login'); if (!box || G.mode !== 'online' || !devToken() || document.getElementById('lg-lab')) return;
    const row = document.createElement('div'); row.id = 'lg-lab';
    row.style.cssText = 'margin-top:10px;font-size:13px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;justify-content:center;opacity:.9';
    row.innerHTML = '<span>Laboratoire</span><select id="lg-lab-n"><option>1</option><option>2</option><option>3</option></select><button class="chip" id="lg-lab-go">Réinitialiser</button>';
    (document.getElementById('lg-note') || box).after(row);
    document.getElementById('lg-lab-go').onclick = () => { D.resetSlot = +document.getElementById('lg-lab-n').value || 1; G.send({ t: 'dev', a: 'labreset', tok: devToken(), slot: D.resetSlot }); };
  };
  return D;
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function askSecret(G) {
  if (document.getElementById('dev-ask')) return;
  const w = document.createElement('div'); w.id = 'dev-ask';
  w.style.cssText = 'position:absolute;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;background:rgba(8,4,2,.5)';
  w.innerHTML = '<form class="panel" style="position:relative;width:340px" autocomplete="off"><div class="panel-head"><h2 style="font-size:24px">Accès développeur</h2></div>'
    + '<p style="margin:4px 0 10px;font-size:14px">Le secret est vérifié par le serveur ; il n’est jamais conservé ici.</p>'
    + '<input id="dev-secret" type="password" autocomplete="off" spellcheck="false" style="width:100%;font:16px var(--ui);padding:6px 8px;border:2px solid var(--wood2);border-radius:3px;background:#fbf2da;color:var(--ink)">'
    + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px"><button type="button" class="chip" id="dev-no" style="font-size:14px;padding:4px 10px">Annuler</button><button class="btn">Valider</button></div></form>';
  document.body.appendChild(w);
  const inp = w.querySelector('#dev-secret'); inp.focus();
  const close = () => { inp.value = ''; w.remove(); };
  w.querySelector('#dev-no').onclick = close;
  inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape') close(); });
  w.querySelector('form').onsubmit = (e) => { e.preventDefault(); const s = inp.value; close(); if (s) G.send({ t: 'dev', a: 'unlock', s }); };
}
async function mount(G, D, m, deps) {
  if (D.panel) { D.panel.update(m); D.panel.toggle(true); return; }
  if (!m.code) return G.ui.toast('Panneau développeur indisponible sur ce serveur.', 'warn');
  const url = URL.createObjectURL(new Blob([m.code], { type: 'text/javascript' }));
  try {
    const mod = await import(/* @vite-ignore */ url);
    D.panel = mod.mount({ G, deps, cat: m.cat, lab: m.lab, send: (c, extra) => G.send(Object.assign({ t: 'dev', a: 'cmd', tok: devToken(), c }, extra || {})), token: devToken });
  } catch (e) { G.ui.toast('Panneau développeur : chargement impossible.', 'warn'); console.error(e); }
  finally { URL.revokeObjectURL(url); }
}
