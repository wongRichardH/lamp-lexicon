// Slow gold, pink and lilac sparkles, bubbles and tiny crescent moons drifting upward behind the page.
(function () {
  const c = document.getElementById('sky');
  if (!c) return;
  const ctx = c.getContext('2d');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const colors = ['#f4c95e', '#ff9cc8', '#b8a2ff', '#8cc3ff', '#ffe08a'];
  let w, h, dpr, items = [];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = c.clientWidth; h = c.clientHeight;
    c.width = w * dpr; c.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(60, (w * h) / 26000));
    items = Array.from({ length: n }, () => make(true));
  }
  function make(anywhere) {
    const roll = Math.random();
    return {
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : h + 20,
      r: 2 + Math.random() * 6,
      vy: 0.08 + Math.random() * 0.22,
      sway: Math.random() * Math.PI * 2,
      color: colors[(Math.random() * colors.length) | 0],
      kind: roll < 0.12 ? 'moon' : roll < 0.55 ? 'star' : 'bubble',
      phase: Math.random() * Math.PI * 2
    };
  }
  function star(x, y, r) {
    ctx.beginPath();
    ctx.moveTo(x, y - r * 2);
    ctx.quadraticCurveTo(x, y, x + r * 2, y);
    ctx.quadraticCurveTo(x, y, x, y + r * 2);
    ctx.quadraticCurveTo(x, y, x - r * 2, y);
    ctx.quadraticCurveTo(x, y, x, y - r * 2);
    ctx.fill();
  }
  // Crescent opening to the right: outer arc down the left side, shallower inner arc back up.
  function moon(x, y, r) {
    const d = r * 0.6, R2 = Math.hypot(r, d);
    ctx.beginPath();
    ctx.arc(x, y, r, -Math.PI / 2, Math.PI / 2, true);
    ctx.arc(x + d, y, R2, Math.atan2(r, -d), Math.atan2(-r, -d), false);
    ctx.fill();
  }
  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    for (const p of items) {
      const a = 0.35 + 0.35 * Math.sin(t / 1400 + p.phase);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      const x = p.x + Math.sin(t / 3000 + p.sway) * 12;
      if (p.kind === 'star') star(x, p.y, p.r * 0.9);
      else if (p.kind === 'moon') { ctx.fillStyle = '#f4c95e'; moon(x, p.y, p.r * 1.6); }
      else {
        ctx.beginPath(); ctx.arc(x, p.y, p.r * 1.4, 0, Math.PI * 2);
        ctx.strokeStyle = p.color; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.globalAlpha = a * 0.25; ctx.fill();
      }
      if (!reduce) { p.y -= p.vy; if (p.y < -20) Object.assign(p, make(false)); }
    }
    if (!reduce) requestAnimationFrame(draw);
  }
  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(draw);
})();
