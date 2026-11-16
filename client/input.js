// Clavier (positions physiques pour bouger : ZQSD en AZERTY = WASD en QWERTY)
// et souris. Le jeu se joue sur ordinateur.
export class Input {
  constructor(canvas, isTyping) {
    this.cv = canvas;
    this.isTyping = isTyping;
    this.keys = new Set();
    this.pressed = [];
    this.mouse = { x: 0, y: 0, left: false, right: false, moved: false };
    window.addEventListener('keydown', (e) => {
      if (this.isTyping()) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
      if (!e.repeat) this.pressed.push({ code: e.code, key: (e.key || '').toLowerCase(), shift: e.shiftKey });
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => { this.keys.delete(e.code); });
    window.addEventListener('blur', () => { this.keys.clear(); this.mouse.left = this.mouse.right = false; });
    canvas.addEventListener('mousemove', (e) => { this.mouse.x = e.offsetX; this.mouse.y = e.offsetY; this.mouse.moved = true; });
    canvas.addEventListener('mousedown', (e) => {
      this.mouse.x = e.offsetX; this.mouse.y = e.offsetY;
      if (e.button === 0) this.mouse.left = true;
      if (e.button === 2) { this.mouse.right = true; this.pressed.push({ code: 'MouseRight', key: '' }); }
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    });
    window.addEventListener('mouseup', (e) => { if (e.button === 0) this.mouse.left = false; if (e.button === 2) this.mouse.right = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  down(...codes) { return codes.some((c) => this.keys.has(c)); }
  axis() {
    let x = 0, y = 0;
    if (this.down('KeyA', 'ArrowLeft')) x -= 1;
    if (this.down('KeyD', 'ArrowRight')) x += 1;
    if (this.down('KeyW', 'ArrowUp')) y -= 1;
    if (this.down('KeyS', 'ArrowDown')) y += 1;
    const l = Math.hypot(x, y);
    if (l > 1) { x /= l; y /= l; }
    return { x, y };
  }
  takePressed() { const p = this.pressed; this.pressed = []; return p; }
}
