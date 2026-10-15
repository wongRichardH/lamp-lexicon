// Preview drawings for every lexicon term, plus the live lamp in the prompt builder.
// Shades are surfaces of revolution: a silhouette r(t) (t = 0 at the top rim, 1 at the
// bottom rim) seen slightly from above. Patterns are mapped onto the visible front half
// with S(theta, t), so ribs twist and holes foreshorten the way they would on a real shade.
(function () {
  const PI = Math.PI, TAU = 2 * PI, E = 0.2;
  let uid = 0;
  const f = n => Math.round(n * 10) / 10;
  const P = pts => 'M' + pts.map(p => f(p[0]) + ' ' + f(p[1])).join('L') + 'Z';
  const path = (cls, d, extra = '') => d ? `<path class="${cls}" d="${d}"${extra}/>` : '';
  const sw = w => ` style="stroke-width:${f(w)}"`;
  const steps = n => Array.from({ length: n - 1 }, (_, j) => (j + 1) / n);
  function rng(seed) { let s = seed; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  function ease(pts) {
    return t => {
      for (let i = 1; i < pts.length; i++) {
        const [t0, r0] = pts[i - 1], [t1, r1] = pts[i];
        if (t <= t1) return r0 + (r1 - r0) * (1 - Math.cos((t - t0) / (t1 - t0) * PI)) / 2;
      }
      return pts[pts.length - 1][1];
    };
  }

  // Silhouettes: radius as a fraction of R, from top rim (t=0) to bottom rim (t=1).
  const SIL = {
    drum: () => 0.8,
    empire: t => 0.5 + 0.45 * t,
    cone: t => 0.14 + 0.86 * t,
    bell: t => 0.42 + 0.08 * t + 0.48 * t ** 3,
    dome: t => Math.max(0.12, Math.sqrt(1 - (1 - t) ** 2)),
    globe: t => Math.max(0.26, Math.sqrt(Math.max(0, 1 - (2 * t - 1) ** 2))),
    hourglass: t => 0.48 + 0.44 * (2 * t - 1) ** 2,
    vase: ease([[0, 0.42], [0.1, 0.34], [0.6, 0.95], [1, 0.5]]),
    lofted: t => 0.66 + 0.18 * t,
    revolved: ease([[0, 0.56], [0.5, 1], [1, 0.74]]),
    polygonal: () => 0.78,
    tapered: t => 0.4 + 0.46 * t,
    tile: t => 0.7 + 0.12 * t,
    flipped: t => 0.95 - 0.45 * t
  };

  function mk(o) {
    const r = SIL[o.sil] || SIL.drum;
    const k = Math.max(0.45, Math.min(1.4, Math.sqrt(o.h / 82 * o.R / 50)));
    const S = (th, t) => {
      t = Math.min(1, Math.max(0, t));
      const q = o.R * r(t);
      return [o.cx + q * Math.sin(th), o.y + t * o.h + E * q * Math.cos(th)];
    };
    return Object.assign({}, o, { r, k, S,
      rows: n => Math.max(2, Math.round(n * o.h / 82)),
      cols: n => Math.max(3, Math.round(n * o.R / 50)) });
  }

  function outline(sh) {
    const { cx, y, h, R, r } = sh, N = 36;
    let d = '';
    for (let i = 0; i <= N; i++) d += (i ? 'L' : 'M') + f(cx + R * r(i / N)) + ' ' + f(y + i / N * h);
    const rb = R * r(1), rt = R * r(0);
    d += `A${f(rb)} ${f(rb * E)} 0 0 1 ${f(cx - rb)} ${f(y + h)}`;
    for (let i = N; i >= 0; i--) d += 'L' + f(cx - R * r(i / N)) + ' ' + f(y + i / N * h);
    return d + `A${f(rt)} ${f(rt * E)} 0 0 1 ${f(cx + rt)} ${f(y)}Z`;
  }

  // A line on the surface, fn(s) -> [theta, t]; only the front-facing parts are drawn.
  function trace(sh, fn, n = 40) {
    let d = '', pen = false;
    for (let i = 0; i <= n; i++) {
      const [th, t] = fn(i / n);
      if (Math.cos(th) < 0.02) { pen = false; continue; }
      const [x, y] = sh.S(th, t);
      d += (pen ? 'L' : 'M') + f(x) + ' ' + f(y);
      pen = true;
    }
    return d;
  }
  const ring = (sh, t) => trace(sh, s => [-PI / 2 + PI * s, t], 24);

  // A vertical strip of the front surface between two angles.
  function band(sh, a, b, t0, t1, n = 12) {
    const w = b - a;
    a = ((a + PI) % TAU + TAU) % TAU - PI; b = a + w;
    if (b <= -PI / 2 || a >= PI / 2) return '';
    a = Math.max(a, -PI / 2); b = Math.min(b, PI / 2);
    const L = [], Rr = [];
    for (let i = 0; i <= n; i++) { const t = t0 + (t1 - t0) * i / n; L.push(sh.S(a, t)); Rr.push(sh.S(b, t)); }
    return P(L.concat(Rr.reverse()));
  }

  // A small flat shape placed on the surface, squashed sideways as it turns away.
  function stamp(sh, th, t, size, pts) {
    const c = Math.cos(th);
    if (c < 0.2) return '';
    const [x, y] = sh.S(th, t), s = size * sh.k;
    return P(pts.map(([u, v]) => [x + u * s * c, y + v * s]));
  }
  const poly = (n, rot = 0, rad = () => 1) => Array.from({ length: n }, (_, i) => {
    const a = rot + i * TAU / n, q = rad(i);
    return [Math.cos(a) * q, Math.sin(a) * q];
  });
  const CIRCLE = poly(16), HEX = poly(6, PI / 6), STAR8 = poly(16, 0, i => i % 2 ? 0.5 : 1);
  const OVAL_H = CIRCLE.map(([u, v]) => [u * 1.3, v * 0.55]), OVAL_V = CIRCLE.map(([u, v]) => [u * 0.55, v * 1.3]);
  const PIN = [[-0.6, -2], [0.6, -2], [0.6, 2], [-0.6, 2]];

  function grid(sh, rows, cols, fn, stagger = true) {
    rows = sh.rows(rows); cols = sh.cols(cols);
    let d = '';
    for (let j = 0; j < rows; j++) for (let i = 0; i <= cols; i++) {
      const th = -PI / 2 + PI * (i + (stagger && j % 2 ? 0.5 : 0)) / cols;
      d += fn(th, (j + 0.5) / rows, i, j);
    }
    return d;
  }

  function ribs(sh, n, twist, wob = 0) {
    let dk = '', hl = '';
    for (let i = 0; i < n; i++) {
      const a = i * TAU / n, w = s => wob * Math.sin(s * TAU * 1.5);
      dk += trace(sh, s => [a + twist * s + w(s), s]);
      hl += trace(sh, s => [a + 0.08 + twist * s + w(s), s]);
    }
    return path('pv-l', dk) + path('pv-hl', hl);
  }

  function facets(sh, n) {
    let d = '', l = '';
    for (let i = 0; i < n; i++) {
      const a = -PI + (i + 0.5) * TAU / n, b = a + TAU / n, m = (a + b) / 2;
      const q = band(sh, a, b, 0, 1, 2);
      if (q) d += `<path class="pv-facet" d="${q}" fill-opacity="${f(0.04 + 0.2 * (1 - Math.cos(m + 0.6)) / 2)}"/>`;
      l += trace(sh, s => [a, s], 2);
    }
    return d + path('pv-l', l, sw(1.4));
  }

  function voronoi(sh, size = 6.4) {
    const rnd = rng(5);
    return grid(sh, 5, 6, (th, t) => {
      const n = 5 + (rnd() * 3 | 0), rot = rnd() * PI, rs = Array.from({ length: n }, () => 0.72 + rnd() * 0.4);
      return stamp(sh, th + (rnd() - 0.5) * 0.14, t + (rnd() - 0.5) * 0.04, size, poly(n, rot, i => rs[i]));
    });
  }

  const moon = (cx, cy, r) => `M${f(cx)} ${f(cy - r)}A${f(r)} ${f(r)} 0 1 0 ${f(cx)} ${f(cy + r)}A${f(r * 1.25)} ${f(r * 1.25)} 0 0 1 ${f(cx)} ${f(cy - r)}Z`;
  const sparkD = (x, y, s) => `M${f(x)} ${f(y - s)}Q${f(x)} ${f(y)} ${f(x + s)} ${f(y)}Q${f(x)} ${f(y)} ${f(x)} ${f(y + s)}Q${f(x)} ${f(y)} ${f(x - s)} ${f(y)}Q${f(x)} ${f(y)} ${f(x)} ${f(y - s)}Z`;

  function litho(sh) {
    const { cx, y, h, R, k } = sh, my = y + h * 0.46, r = Math.min(R * 0.42, h * 0.26);
    return `<rect class="pv-dk" x="${f(cx - R - 2)}" y="${f(y - 14)}" width="${f(2 * R + 4)}" height="${f(h + 28)}" fill-opacity=".36"/>` +
      path('pv-cut', moon(cx - r * 0.15, my, r) + sparkD(cx + r * 0.9, my - r * 0.75, 4.5 * k) + sparkD(cx + r * 0.7, my + r * 0.7, 2.8 * k) + sparkD(cx - r * 1.2, my + r * 1.15, 2.4 * k));
  }

  const PAT = {
    smooth: () => '',
    diffuser: sh => `<ellipse class="pv-glare" cx="${f(sh.cx - sh.R * 0.12)}" cy="${f(sh.y + sh.h * 0.5)}" rx="${f(sh.R * 0.3)}" ry="${f(sh.h * 0.42)}"/>`,
    ribbed: sh => ribs(sh, 20, 0),
    twisted: sh => ribs(sh, 18, PI * 0.7),
    wave: sh => ribs(sh, 16, 0, 0.2),
    diamond: sh => ribs(sh, 12, PI * 0.9) + ribs(sh, 12, -PI * 0.9),
    pleated: sh => {
      let d = '', l = '';
      for (let i = 0; i < 28; i++) {
        const a = -PI + i * TAU / 28;
        if (i % 2) d += band(sh, a, a + TAU / 28, 0, 1);
        l += trace(sh, s => [a, s], 6);
      }
      return path('pv-dk', d, ' fill-opacity=".18"') + path('pv-l', l);
    },
    rings: sh => {
      const ts = steps(sh.rows(8));
      return path('pv-cuts', ts.map(t => ring(sh, t)).join(''), sw(3.4 * sh.k)) + path('pv-l', ts.map(t => ring(sh, t + 0.035)).join(''));
    },
    louvered: sh => {
      const ts = steps(sh.rows(9));
      return path('pv-l', ts.map(t => ring(sh, t + 0.02)).join(''), sw(2.8 * sh.k)) + path('pv-hl', ts.map(t => ring(sh, t - 0.012)).join(''));
    },
    relief: sh => steps(7).map((t, i) => path('pv-relief', ring(sh, t), sw((i % 2 ? 2 : 5.5) * sh.k))).join(''),
    spiral: sh => path('pv-l', trace(sh, s => [s * TAU * 4.5, s], 240), sw(2.4 * sh.k)) + path('pv-hl', trace(sh, s => [s * TAU * 4.5 + 0.12, s], 240)),
    vasespiral: sh => path('pv-l', trace(sh, s => [s * TAU * 15, s], 900), sw(0.7)),
    knurled: sh => {
      let d = '';
      for (let i = 0; i < 44; i++) { const a = i * TAU / 44; d += trace(sh, s => [a + PI * 0.6 * s, s], 20) + trace(sh, s => [a - PI * 0.6 * s, s], 20); }
      return path('pv-l', d, sw(0.6));
    },
    faceted: sh => {
      const rnd = rng(11), cols = 9, rows = 5, N = [];
      for (let j = 0; j <= rows; j++) {
        N[j] = [];
        for (let i = 0; i <= cols; i++) {
          const edge = i === 0 || i === cols || j === 0 || j === rows;
          N[j][i] = [-PI / 2 + PI * i / cols + (edge ? 0 : (rnd() - 0.5) * 0.2), j / rows + (edge ? 0 : (rnd() - 0.5) * 0.09)];
        }
      }
      let out = '';
      const tri = (...p) => { out += `<path class="pv-facet" d="${P(p.map(q => sh.S(q[0], q[1])))}" fill-opacity="${f(0.03 + rnd() * 0.24)}"/>`; };
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        tri(N[j][i], N[j][i + 1], N[j + 1][i]);
        tri(N[j][i + 1], N[j + 1][i + 1], N[j + 1][i]);
      }
      return out;
    },
    miura: sh => {
      const cols = 12, rows = 6;
      const node = (i, j) => [-PI / 2 + PI * i / cols, j / rows + (j > 0 && j < rows ? (i % 2 ? 0.05 : -0.05) : 0)];
      let out = '';
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const q = [node(i, j), node(i + 1, j), node(i + 1, j + 1), node(i, j + 1)].map(p => sh.S(p[0], p[1]));
        out += `<path class="pv-facet" d="${P(q)}" fill-opacity="${(i + j) % 2 ? 0.24 : 0.04}"/>`;
      }
      return out;
    },
    islamic: sh => path('pv-cut', grid(sh, 4, 5, (th, t) => stamp(sh, th, t, 7.5, STAR8))),
    voronoi: sh => path('pv-cut', voronoi(sh)),
    gyroid: sh => path('pv-cut', grid(sh, 7, 7, (th, t, i, j) => stamp(sh, th, t, 4.8, (i + j) % 2 ? OVAL_H : OVAL_V), false)),
    honeycomb: sh => path('pv-cut', grid(sh, 7, 9, (th, t) => stamp(sh, th, t, 4.4, HEX))),
    perforated: sh => path('pv-cut', grid(sh, 9, 10, (th, t) => stamp(sh, th, t, 1 + 3 * t, CIRCLE))),
    coral: sh => {
      const rnd = rng(3), cols = sh.cols(10), rows = sh.rows(7), dth = PI / cols, dt = 1 / rows;
      let d = '';
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const th0 = -PI / 2 + i * dth, t0 = j * dt;
        const arc = (cu, cv, a0) => trace(sh, s => { const a = a0 + s * PI / 2; return [th0 + (cu + 0.5 * Math.cos(a)) * dth, t0 + (cv + 0.5 * Math.sin(a)) * dt]; }, 8);
        d += rnd() < 0.5 ? arc(0, 0, 0) + arc(1, 1, PI) : arc(1, 0, PI / 2) + arc(0, 1, -PI / 2);
      }
      return path('pv-cuts', d, sw(2.6 * sh.k));
    },
    superformula: sh => {
      const { cx, y, R } = sh, rt = R * sh.r(0), pts = [];
      for (let i = 0; i < 72; i++) {
        const a = i * TAU / 72, q = rt * (0.78 + 0.22 * Math.cos(6 * (a - PI / 2)));
        pts.push([cx + q * Math.cos(a), y + E * q * Math.sin(a)]);
      }
      let d = '';
      for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + TAU / 12; d += band(sh, a, a + TAU / 12, 0, 1); }
      return { in: path('pv-dk', d, ' fill-opacity=".16"') + ribs(sh, 6, 0), out: `<path class="pv-in" d="${P(pts)}"/>`, noTop: true };
    },
    double: sh => {
      const ri = sh.R * 0.46;
      return {
        in: path('pv-cut2', voronoi(sh)) + `<path class="pv-dim" d="M${f(sh.cx - ri)} ${f(sh.y)}V${f(sh.y + sh.h)}M${f(sh.cx + ri)} ${f(sh.y)}V${f(sh.y + sh.h)}"/>`,
        out: `<ellipse class="pv-sleeve" cx="${f(sh.cx)}" cy="${f(sh.y)}" rx="${f(ri)}" ry="${f(ri * E)}"/>`
      };
    },
    litho: sh => litho(sh),
    lithopanels: sh => facets(sh, 6) + litho(sh),
    facets8: sh => facets(sh, 8),
    loft: sh => {
      const { cx, y, R } = sh, rt = R * sh.r(0);
      const hex = poly(6).map(([u, v]) => [cx + u * rt, y + v * rt * E]);
      let l = '';
      for (const th of [-PI / 6, PI / 6]) [[0, 0.25, 0.8], [0.25, 0.5, 0.45], [0.5, 0.75, 0.18]].forEach(([a, b, o]) => {
        l += `<path class="pv-l" d="${trace(sh, s => [th, a + (b - a) * s], 6)}" style="opacity:${o};stroke-width:1.4"/>`;
      });
      return { in: l, out: `<path class="pv-in" d="${P(hex)}"/>`, noTop: true };
    },
    revolve: sh => {
      const { cx, y, h, R } = sh;
      let o = `<path class="pv-dim" d="M${f(cx)} ${f(y - 8)}V${f(y + h + 10)}"/>`;
      for (const [t, lab] of [[0, 'Ø90'], [0.5, 'Ø160'], [1, 'Ø120']]) {
        const x = cx + R * sh.r(t), yy = y + t * h;
        o += `<circle class="pv-dot" cx="${f(x)}" cy="${f(yy)}" r="2.4"/>` + txt(f(x + 5), f(yy + 3), lab);
      }
      return { out: o };
    },
    taper: sh => {
      const { y, h, R, cx } = sh, x0 = cx + R * sh.r(0), x1 = cx + R * sh.r(1), a = Math.atan2(x1 - x0, h);
      return { out: `<path class="pv-dim" d="M${f(x0)} ${f(y)}V${f(y + h)}"/><path class="pv-arc" d="M${f(x0)} ${f(y + 24)}A24 24 0 0 0 ${f(x0 + 24 * Math.sin(a))} ${f(y + 24 * Math.cos(a))}"/>` + txt(f(x0 + 4), f(y + 40), 'taper°') };
    },
    seams: sh => path('pv-seam', [-0.9, 0.9].map(a => trace(sh, s => [a, s], 8)).join('')),
    frame: sh => path('pv-frame', [-PI / 3, 0, PI / 3].map(a => trace(sh, s => [a, s], 4)).join('')) + path('pv-l', ring(sh, 0.5)),
    split: sh => ({
      in: path('pv-seamred', ring(sh, 0.5)),
      out: path('pv-metal', [-0.9, 0, 0.9].map(a => stamp(sh, a, 0.5, 2.4, PIN)).join(''))
    })
  };

  function shadeSVG(o) {
    const sh = mk(o), d = outline(sh), id = 'pvc' + (++uid);
    let p = (PAT[o.pat] || PAT.smooth)(sh);
    if (typeof p === 'string') p = { in: p };
    const rt = sh.R * sh.r(0);
    const top = p.noTop || sh.r(0) < 0.15 ? '' : `<ellipse class="pv-in" cx="${f(sh.cx)}" cy="${f(sh.y)}" rx="${f(rt)}" ry="${f(rt * E)}"/>`;
    return `<clipPath id="${id}"><path d="${d}"/></clipPath><path class="pv-sh${o.mat ? ' m-' + o.mat : ''}" d="${d}"/>` +
      `<g clip-path="url(#${id})">${p.in || ''}</g><path class="pv-edge" d="${d}"/>${top}${p.out || ''}`;
  }

  const halo = (cx, cy, r) => `<circle class="pv-halo" cx="${cx}" cy="${cy}" r="${r}"/>`;
  const surf = y => `<path class="pv-surf" d="M8 ${y}H152"/>`;
  const spark = (x, y, s) => path('pv-spark', sparkD(x, y, s));
  const txt = (x, y, s, a) => `<text class="pv-t" x="${x}" y="${y}"${a ? ` text-anchor="${a}"` : ''}>${s}</text>`;
  const label = txt;
  const mark = (x, y, ok) => ok ? `<path class="pv-ok" d="M${x - 5} ${y}l3.5 4l7-9"/>` : `<path class="pv-bad" d="M${x - 4} ${y - 4}l8 8M${x + 4} ${y - 4}l-8 8"/>`;
  const arrow = (d, hx, hy, rot) => `<path class="pv-arrow" d="${d}"/><path class="pv-head" d="M0 0L-6 -3.5V3.5Z" transform="translate(${hx} ${hy}) rotate(${rot})"/>`;
  const thr = (x, y, w, h, s) => { let d = ''; for (let i = 3; i < h; i += s) d += `M${x} ${y + i}L${x + w} ${y + i - 3}`; return d; };

  // Lamp forms. Each draw() gets sh(o), which renders a shade with the current silhouette,
  // pattern and material merged in, so the builder reuses the same scenes.
  const FORMS = {
    table: { sil: 'empire', pat: 'smooth', draw: sh => halo(80, 42, 58) + surf(114) +
      '<rect class="pv-metal" x="78" y="58" width="4" height="48"/><path class="pv-base" d="M58 114Q58 103 80 102Q102 103 102 114Z"/>' +
      sh({ cx: 80, y: 12, h: 48, R: 38 }) },
    bedside: { sil: 'drum', pat: 'smooth', draw: sh => halo(80, 56, 46) +
      '<rect class="pv-base" x="20" y="106" width="120" height="8" rx="2"/><path class="pv-base" d="M68 106C60 98 62 86 72 82C70 78 72 74 80 74C88 74 90 78 88 82C98 86 100 98 92 106Z"/>' +
      sh({ cx: 80, y: 40, h: 34, R: 28 }) + spark(126, 30, 5) + spark(34, 46, 3.5) },
    mushroom: { sil: 'dome', pat: 'smooth', draw: sh => halo(80, 48, 60) + surf(114) +
      '<path class="pv-base" d="M54 112v-4a26 5 0 0 1 52 0v4a26 5 0 0 1-52 0Z"/><path class="pv-base" d="M74 108L76 52H84L86 108Z"/><path class="pv-ln" d="M78.5 56V104M81.5 56V104" style="opacity:.35"/>' +
      sh({ cx: 80, y: 14, h: 36, R: 56 }) },
    pendant: { sil: 'bell', pat: 'smooth', draw: sh => '<path class="pv-beam" d="M46 82L14 120H146L114 82Z"/>' + halo(80, 62, 52) +
      '<path class="pv-surf" d="M36 3H124"/><path class="pv-base" d="M66 3h28l-4 6H70Z"/><path class="pv-cord" d="M80 9V34"/><rect class="pv-metal" x="76.5" y="29" width="7" height="8" rx="1"/>' +
      sh({ cx: 80, y: 36, h: 44, R: 40 }) },
    sconce: { sil: 'drum', pat: 'perforated', draw: sh => '<path class="pv-beam-up" d="M64 34L42 0H118L96 34Z"/><path class="pv-beam" d="M64 86L42 120H118L96 86Z"/>' +
      '<rect class="pv-base" x="64" y="10" width="32" height="100" rx="9"/><circle class="pv-hole" cx="80" cy="18" r="2.2"/><circle class="pv-hole" cx="80" cy="102" r="2.2"/>' +
      sh({ cx: 80, y: 32, h: 54, R: 30 }) },
    floor: { sil: 'drum', pat: 'seams', draw: sh => halo(80, 26, 42) + surf(116) +
      '<rect class="pv-metal" x="78.5" y="36" width="3" height="76"/><path class="pv-base" d="M56 116a24 6 0 0 1 48 0Z"/>' +
      sh({ cx: 80, y: 6, h: 32, R: 30 }) },
    desk: { sil: 'cone', pat: 'smooth', draw: sh => surf(114) + '<path class="pv-beam" d="M100 62L78 114H150L124 58Z"/>' +
      '<path class="pv-base" d="M24 114v-5a16 4 0 0 1 32 0v5Z"/><path class="pv-arm" d="M40 106L56 62L104 44"/><circle class="pv-metal" cx="40" cy="106" r="3"/><circle class="pv-metal" cx="56" cy="62" r="3"/>' +
      `<g transform="rotate(-28 112 50)">${sh({ cx: 112, y: 36, h: 26, R: 22 })}</g><circle class="pv-metal" cx="104" cy="44" r="3"/>` },
    lantern: { sil: 'drum', pat: 'frame', draw: sh => halo(80, 64, 52) + '<path class="pv-cord" d="M68 24Q80 4 92 24" style="stroke-width:2"/>' +
      sh({ cx: 80, y: 32, h: 66, R: 24 }) + '<path class="pv-base" d="M58 34L68 22H92L102 34Z"/><rect class="pv-base" x="56" y="98" width="48" height="9" rx="2"/>' },
    clip: { sil: 'bell', pat: 'smooth', draw: sh => '<path class="pv-beam" d="M102 60L84 120H152L128 56Z"/><rect class="pv-base" x="4" y="84" width="78" height="9"/>' +
      '<path class="pv-arm" d="M82 80Q90 50 106 44"/><path class="pv-metal" d="M70 78H88V99H70V95H84V82H70Z"/>' +
      `<g transform="rotate(-24 116 46)">${sh({ cx: 116, y: 32, h: 26, R: 22 })}</g>` },
    night: { sil: 'dome', pat: 'smooth', draw: sh => halo(80, 76, 44) + surf(112) +
      '<path class="pv-base" d="M50 100v6a30 6 0 0 0 60 0v-6"/><ellipse class="pv-base" cx="80" cy="100" rx="30" ry="6"/>' +
      sh({ cx: 80, y: 62, h: 36, R: 28 }) + path('pv-gold', moon(40, 36, 10)) + spark(116, 30, 6) + spark(128, 50, 3.5) },
    litho: { sil: 'polygonal', pat: 'lithopanels', draw: sh => halo(80, 58, 56) +
      '<rect class="pv-base" x="52" y="98" width="56" height="10" rx="2"/>' + sh({ cx: 80, y: 18, h: 80, R: 36 }) },
    modular: { sil: 'drum', pat: 'rings', draw: (sh, c) => halo(80, 58, 58) + '<rect class="pv-base" x="50" y="104" width="60" height="9" rx="2"/>' +
      [[76, 'rings'], [46, 'ribbed'], [16, 'perforated']].map(([y, p]) => sh({ cx: 80, y, h: 26, R: 30, sil: 'drum', pat: c.user ? c.pat : p })).join('') }
  };

  function lamp(form, cfg = {}) {
    const F = FORMS[form] || FORMS.table;
    const c = { sil: cfg.sil || F.sil, pat: cfg.pat || F.pat, mat: cfg.mat || '', user: !!cfg.sil };
    return F.draw(o => shadeSVG(Object.assign({ sil: c.sil, pat: c.pat, mat: c.mat }, o)), c);
  }

  const silTile = (sil, pat = 'smooth') => halo(80, 56, 58) + shadeSVG({ cx: 80, y: 18, h: 76, R: 46, sil, pat });
  const patTile = pat => halo(80, 56, 60) + shadeSVG({ cx: 80, y: 14, h: 84, R: 48, sil: 'tile', pat });

  // Every term, keyed by a slug of its name.
  const PV = {
    // forms
    'table-lamp': () => lamp('table'),
    'bedside-accent-lamp': () => lamp('bedside'),
    'mushroom-lamp': () => lamp('mushroom'),
    'pendant': () => lamp('pendant'),
    'wall-sconce': () => lamp('sconce'),
    'floor-lamp': () => lamp('floor'),
    'desk-task-lamp': () => lamp('desk'),
    'lantern': () => lamp('lantern'),
    'clip-on-clamp-lamp': () => lamp('clip'),
    'night-light-puck-light': () => lamp('night'),
    'lithophane-lamp': () => lamp('litho'),
    'modular-stackable': () => lamp('modular'),
    // silhouettes
    'drum-cylinder': () => silTile('drum'),
    'empire': () => silTile('empire'),
    'coolie-cone': () => silTile('cone'),
    'bell': () => silTile('bell'),
    'dome': () => silTile('dome'),
    'globe-sphere': () => silTile('globe'),
    'hourglass-waisted': () => silTile('hourglass'),
    'vase-urn': () => silTile('vase'),
    'lofted-profile': () => silTile('lofted', 'loft') + label(80, 116, 'hexagon top → circle base', 'middle'),
    'revolved-profile': () => silTile('revolved', 'revolve'),
    'polygonal-n-gon': () => silTile('polygonal', 'facets8'),
    'tapered': () => silTile('tapered', 'taper'),
    // patterns
    'ribbed-fluted': () => patTile('ribbed'),
    'twisted-rib-helical-twist': () => patTile('twisted'),
    'pleated': () => patTile('pleated'),
    'wave-sinusoidal': () => patTile('wave'),
    'stacked-rings-tiered': () => patTile('rings'),
    'louvered-slatted': () => patTile('louvered'),
    'spiral': () => patTile('spiral'),
    'faceted-low-poly': () => patTile('faceted'),
    'origami-miura-fold': () => patTile('miura'),
    'diamond-argyle': () => patTile('diamond'),
    'penrose-islamic-tiling': () => patTile('islamic'),
    'voronoi': () => patTile('voronoi'),
    'gyroid-tpms-lattice': () => patTile('gyroid'),
    'hex-lattice-honeycomb': () => patTile('honeycomb'),
    'perforated': () => patTile('perforated'),
    'reaction-diffusion-coral': () => patTile('coral'),
    'superformula': () => patTile('superformula'),
    'knurled-textured': () => patTile('knurled'),
    'diffuser-opal-effect': () => patTile('diffuser'),
    'cut-through-vs-relief': () => halo(42, 56, 42) + halo(118, 56, 42) +
      [[8, 30], [12, 72], [72, 94], [74, 26], [6, 100], [70, 60]].map(([x, y]) => `<circle class="pv-speck" cx="${x}" cy="${y}" r="1.8"/>`).join('') +
      shadeSVG({ cx: 42, y: 18, h: 72, R: 30, sil: 'drum', pat: 'perforated' }) + shadeSVG({ cx: 118, y: 18, h: 72, R: 30, sil: 'drum', pat: 'relief' }) +
      label(42, 114, 'cut-through', 'middle') + label(118, 114, 'relief', 'middle'),
    'double-wall-inner-diffuser': () => patTile('double'),
    'lithophane': () => patTile('litho'),

    // socket & electrical
    'e26-e27': () => halo(80, 32, 40) +
      '<path class="pv-bulb" d="M80 6C60 6 52 24 57 38C61 49 69 52 69 60H91C91 52 99 49 103 38C108 24 100 6 80 6Z"/><path class="pv-metal" d="M69 60H91V80H69Z"/>' +
      path('pv-ln', thr(69, 60, 22, 16, 4.5), ' style="opacity:.5"') + '<path class="pv-base" d="M62 74H98V112H62Z"/><path class="pv-dim" d="M92 66H104"/>' + label(106, 69, 'Ø26/27 mm'),
    'e12-e14': () => '<path class="pv-dim" d="M24 58H46V80H24Z"/>' + label(35, 92, 'E26', 'middle') + halo(92, 34, 34) +
      '<path class="pv-bulb" d="M92 8C88 18 78 30 78 44C78 52 82 56 84 58H100C102 56 106 52 106 44C106 30 96 18 92 8Z"/><path class="pv-metal" d="M86 58H98V80H86Z"/>' +
      path('pv-ln', thr(86, 58, 12, 14, 4), ' style="opacity:.5"') + '<path class="pv-base" d="M82 72H102V112H82Z"/><path class="pv-dim" d="M99 64H108"/>' + label(110, 67, 'Ø12/14'),
    'gu10-g9': () => halo(42, 34, 32) + halo(118, 34, 28) +
      '<path class="pv-bulb" d="M20 16H64L56 50H28Z"/><path class="pv-in" d="M24 16H60" style="stroke-width:2"/><path class="pv-metal" d="M33 50h6v16h-6zM49 50h6v16h-6z"/><path class="pv-metal" d="M30 62h12v5H30zM46 62h12v5H46z"/>' +
      '<rect class="pv-bulb" x="108" y="12" width="20" height="40" rx="10"/><path class="pv-fil" d="M112 30l4 4l4-4l4 4"/><path class="pv-pin" d="M112 52v10a3 3 0 0 0 6 0V52M118 52v10a3 3 0 0 0 6 0V52"/>' +
      label(42, 86, 'GU10', 'middle') + label(42, 98, 'twist-lock', 'middle') + label(118, 86, 'G9', 'middle') + label(118, 98, 'loop pins', 'middle'),
    'a19-g25-st64-b10': () => halo(80, 38, 70) +
      '<path class="pv-bulb" d="M22 18C10 18 6 30 10 40C13 47 17 49 17 56H27C27 49 31 47 34 40C38 30 34 18 22 18Z"/><rect class="pv-metal" x="17" y="56" width="10" height="10"/>' +
      '<circle class="pv-bulb" cx="60" cy="36" r="20"/><rect class="pv-metal" x="55" y="56" width="10" height="10"/>' +
      '<path class="pv-bulb" d="M100 12C112 22 116 34 114 44C112 52 106 56 105 58H95C94 56 88 52 86 44C84 34 88 22 100 12Z"/><path class="pv-fil" d="M96 52V38L100 30L104 38V52"/><rect class="pv-metal" x="95" y="58" width="10" height="8"/>' +
      '<path class="pv-bulb" d="M138 20C134 30 130 38 130 46C130 52 133 55 134 58H142C143 55 146 52 146 46C146 38 142 30 138 20Z"/><rect class="pv-metal" x="134" y="58" width="8" height="8"/>' +
      label(22, 84, 'A19', 'middle') + label(60, 84, 'G25', 'middle') + label(100, 84, 'ST64', 'middle') + label(138, 84, 'B10', 'middle') +
      label(22, 96, 'standard', 'middle') + label(60, 96, 'globe', 'middle') + label(100, 96, 'Edison', 'middle') + label(138, 96, 'candle', 'middle'),
    'keyless-socket': () => '<rect class="pv-metal" x="34" y="18" width="20" height="10"/><path class="pv-base" d="M30 28H58V70H30Z"/>' + label(64, 46, '← no switch here') +
      '<path class="pv-cord" d="M44 70V86Q44 96 56 96H86"/><rect class="pv-base" x="86" y="89" width="28" height="14" rx="7"/><rect class="pv-pink" x="95" y="92" width="10" height="8" rx="3"/><path class="pv-cord" d="M114 96H152"/>' +
      label(100, 116, 'inline cord switch', 'middle'),
    'socket-shell-cap': () => '<path class="pv-metal" d="M60 8H100V52H60Z"/>' + label(106, 32, 'shell') +
      arrow('M80 56V62', 80, 67, 90) + '<path class="pv-metal" d="M58 70H102V84Q102 92 94 92H66Q58 92 58 84Z"/><rect class="pv-hole" x="75" y="86" width="10" height="8"/>' + label(106, 82, 'cap') +
      '<path class="pv-dim" d="M76 94V118M84 94V118"/>' + label(90, 112, 'lamp pipe'),
    'shade-ring-socket-ring': () => '<path class="pv-bulb" d="M66 30C58 8 102 8 94 30Z"/><rect class="pv-base" x="62" y="48" width="36" height="60"/><rect class="pv-metal" x="60" y="28" width="40" height="24"/>' +
      path('pv-ln', thr(60, 28, 40, 22, 4.5), ' style="opacity:.45"') +
      '<path class="pv-plate" d="M16 60H144"/><rect class="pv-metal" x="54" y="50" width="52" height="8" rx="2"/>' +
      label(110, 46, 'shade ring') + label(16, 76, 'uno plate'),
    'lamp-pipe-threaded-nipple': () => '<rect class="pv-metal" x="18" y="44" width="124" height="14" rx="2"/>' +
      path('pv-ln', Array.from({ length: 24 }, (_, i) => `M${22 + i * 5} 44l-3 14`).join(''), ' style="opacity:.45"') +
      '<path class="pv-metal" d="M38 38h10v26H38zM112 38h10v26h-10z"/><ellipse class="pv-hole" cx="142" cy="51" rx="2.5" ry="5"/><path class="pv-cord" d="M142 51H156"/>' +
      label(18, 84, '1/8 IPS · ≈10.3 mm OD') + label(18, 98, 'model a hole for it,') + label(18, 110, 'do not print the pipe'),
    'cord-kit-pendant-kit': () => halo(130, 18, 24) + '<path class="pv-base" d="M12 50h20v20H12Z"/><path class="pv-metal" d="M4 54h8v3H4zM4 63h8v3H4z"/>' +
      '<path class="pv-cord" d="M32 60C52 60 50 92 70 92H84"/><rect class="pv-base" x="84" y="85" width="22" height="14" rx="7"/><path class="pv-cord" d="M106 92C126 92 124 52 130 48"/>' +
      '<rect class="pv-base" x="120" y="28" width="20" height="20" rx="2"/><path class="pv-bulb" d="M130 4C120 4 118 18 122 28H138C142 18 140 4 130 4Z"/>' +
      label(12, 114, 'plug · cord · switch · socket'),
    'strain-relief': () => '<path class="pv-base" d="M48 10H112V60H48Z"/><path class="pv-wire" d="M77 60V22M83 60V22"/><circle class="pv-knot" cx="80" cy="46" r="6"/>' +
      '<path class="pv-metal" d="M66 60h28v10H66z"/><path class="pv-metal" d="M71 70h18l-2 10H73z"/><path class="pv-cord" d="M80 80V114" style="stroke-width:3.2"/>' +
      arrow('M96 94V106', 96, 111, 90) + label(42, 50, 'knot', 'end') + label(100, 70, 'grip') + label(104, 104, 'tug'),
    'harp-finial': () => '<path class="pv-dim" d="M44 30H116L132 98H28Z"/>' + halo(80, 62, 30) +
      '<path class="pv-bulb" d="M80 48C68 48 66 62 72 70V78H88V70C94 62 92 48 80 48Z"/><rect class="pv-base" x="72" y="78" width="16" height="22"/>' +
      '<path class="pv-harp" d="M58 104Q50 50 80 28Q110 50 102 104"/><path class="pv-metal" d="M54 101h52v6H54z"/><rect class="pv-metal" x="78" y="16" width="4" height="13"/><circle class="pv-metal" cx="80" cy="11" r="6"/>' +
      label(90, 12, 'finial') + label(104, 92, 'harp'),
    'cord-channel-wire-chase': () => '<rect class="pv-metal" x="76" y="6" width="8" height="26"/><path class="pv-base" d="M18 30H142V100H18Z"/>' +
      '<path class="pv-chase" d="M80 30V58Q80 82 104 82H142"/><path class="pv-cord" d="M80 30V58Q80 82 104 82H156"/>' +
      label(88, 56, 'smooth bend') + label(18, 114, '≥ cord OD + 1 mm'),
    'felt-pad-weight-pocket': () => '<path class="pv-base" d="M18 20H142V90H18Z"/><rect class="pv-hole" x="48" y="58" width="64" height="32"/>' +
      '<path class="pv-metal" d="M52 66h56v6H52zM52 74h56v6H52zM52 82h56v6H52z"/><rect class="pv-felt" x="18" y="90" width="124" height="6"/>' + surf(97) +
      label(52, 52, 'steel washers') + label(18, 112, 'felt pad underneath'),

    // print terms
    'clearance-tolerance': () => [[30, 1, '0.2 tight'], [80, 2.6, '0.3–0.4'], [130, 4.4, '0.5 loose']].map(([c, g, s]) =>
      `<path class="pv-base" d="M${c - 22} 40H${c + 22}V96H${c - 22}Z"/><rect class="pv-hole" x="${f(c - 9 - g)}" y="40" width="${f(18 + 2 * g)}" height="40"/>` +
      `<path class="pv-sh" d="M${c - 9} 18H${c + 9}V78H${c - 9}Z"/><path class="pv-edge" d="M${c - 9} 18H${c + 9}V78H${c - 9}Z"/>` + label(c, 112, s, 'middle')).join(''),
    'wall-thickness': () => {
      let b = '';
      for (let c = 0; c < 3; c++) for (let y = 26; y < 98; y += 7) b += `<ellipse class="pv-bead" cx="${63 + c * 14}" cy="${y}" rx="7" ry="3.6"/>`;
      return '<path class="pv-dim" d="M56 16H98M56 12V20M98 12V20"/>' + label(77, 10, '1.2 mm', 'middle') + b + label(77, 114, '3 lines × 0.4 mm nozzle', 'middle');
    },
    'vase-mode-spiralize': () => halo(80, 56, 56) + shadeSVG({ cx: 80, y: 12, h: 90, R: 42, sil: 'vase', pat: 'vasespiral' }) + label(80, 117, 'one continuous wall', 'middle'),
    'overhang-45': () => surf(100) + '<path class="pv-base" d="M14 100H30L70 60H54Z"/><path class="pv-base" d="M90 100H106L150 84H134Z"/><path class="pv-sup" d="M112 100V92M120 100V89M128 100V86M136 100V84M144 100V84"/>' +
      mark(36, 54, true) + mark(124, 64, false) + label(14, 114, '45° prints fine') + label(88, 114, '70° needs support'),
    'chamfer-vs-fillet': () => surf(104) + '<path class="pv-base" d="M62 104L50 92V38Q50 24 64 24H116Q130 24 130 38V92L118 104Z"/>' +
      '<path class="pv-hi" d="M50 38Q50 24 64 24M62 104L50 92"/>' + label(44, 30, 'fillet', 'end') + label(44, 100, 'chamfer', 'end') + label(90, 116, 'print bed', 'middle'),
    'print-orientation': () => '<rect class="pv-bed" x="6" y="100" width="148" height="8" rx="2"/>' + halo(44, 66, 38) +
      shadeSVG({ cx: 44, y: 44, h: 54, R: 34, sil: 'empire' }) + shadeSVG({ cx: 118, y: 44, h: 54, R: 34, sil: 'flipped' }) +
      '<path class="pv-sup" d="M92 100V68M100 100V70M136 100V70M144 100V68"/>' + mark(44, 30, true) + mark(118, 30, false) +
      label(44, 118, 'wide rim down', 'middle') + label(118, 118, 'overhangs', 'middle'),
    'split-for-printing': () => halo(80, 56, 58) + shadeSVG({ cx: 80, y: 14, h: 84, R: 46, sil: 'empire', pat: 'split' }) + label(80, 117, 'seam + alignment pins', 'middle'),
    'build-volume': () => '<path class="pv-dim" d="M52 12V84H124M24 108L52 84"/><path class="pv-box" d="M24 36H96V108H24ZM24 36L52 12H124L96 36M124 12V84L96 108"/>' +
      halo(60, 74, 32) + shadeSVG({ cx: 60, y: 56, h: 42, R: 24, sil: 'empire' }) + label(156, 116, '256³ mm', 'end'),
    'first-layer-elephant-s-foot': () => surf(100) + '<path class="pv-base" d="M22 30H62V92Q62 97 68 100H16Q22 97 22 92Z"/><path class="pv-badl" d="M62 92Q62 97 68 100M22 92Q22 97 16 100"/>' +
      '<path class="pv-base" d="M98 30H138V94L132 100H104L98 94Z"/><path class="pv-hi" d="M138 94L132 100M98 94L104 100"/>' +
      mark(42, 20, false) + mark(118, 20, true) + label(42, 114, 'squished flare', 'middle') + label(118, 114, '0.4 mm chamfer', 'middle'),
    'test-coupon-fit-test': () => '<path class="pv-dim" d="M14 22H62L74 96H2Z"/>' + label(38, 110, 'full lamp: hours', 'middle') + arrow('M80 62H92', 97, 62, 0) +
      halo(124, 64, 30) + '<path class="pv-base" d="M100 82v10a24 6 0 0 0 48 0V82"/><ellipse class="pv-base" cx="124" cy="82" rx="24" ry="6"/>' +
      shadeSVG({ cx: 124, y: 56, h: 22, R: 26, sil: 'drum' }) + label(124, 110, 'joint only: minutes', 'middle'),
    'pla-petg-asa': () => [['pla', 'PLA', '~60 °C'], ['petg', 'PETG', '~80 °C'], ['asa', 'ASA', 'heat + UV']].map(([k, n, t], i) => {
      const c = 30 + i * 50;
      return `<circle class="pv-spool sp-${k}" cx="${c}" cy="46" r="21"/><circle class="pv-flange" cx="${c}" cy="46" r="16"/><circle class="pv-base" cx="${c}" cy="46" r="7"/>` +
        label(c, 86, n, 'middle') + label(c, 100, t, 'middle');
    }).join(''),
    'natural-translucent-filament': () => [['natural', 'glows', 'sw-nat'], ['white', 'diffuses', 'sw-white'], ['black', 'blocks', 'sw-black']].map(([n, s, k], i) => {
      const x = 12 + i * 50;
      return halo(x + 18, 50, 30) + `<circle class="pv-bulbdot" cx="${x + 18}" cy="50" r="7"/><rect class="pv-swatch ${k}" x="${x}" y="20" width="36" height="60" rx="4"/>` +
        label(x + 18, 98, n, 'middle') + label(x + 18, 110, s, 'middle');
    }).join(''),
    'heat-set-insert': () => '<path class="pv-base" d="M18 70H142V110H18Z"/><rect class="pv-hole" x="70" y="70" width="20" height="28"/>' +
      '<path class="pv-metal" d="M72 54h16v24H72z"/>' + path('pv-ln', 'M72 58l16 4M72 64l16 4M72 70l16 4', ' style="opacity:.5"') +
      '<path class="pv-iron" d="M76 4h8v34l-2 14h-4l-2-14z"/><path class="pv-heat" d="M64 46q-4-4 0-8t0-8M96 46q4-4 0-8t0-8"/>' +
      label(18, 20, 'hot iron') + label(96, 62, 'brass insert'),
    'watertight-manifold': () => '<path class="pv-mesh" d="M18 92L46 22L76 92Z"/><path class="pv-meshl" d="M46 22L52 66L18 92M52 66L76 92"/>' +
      '<path class="pv-mesh" d="M86 92L114 22L144 92Z"/><path class="pv-hole" d="M114 22L120 66L144 92Z"/><path class="pv-badl" d="M114 22L120 66L144 92Z"/><path class="pv-meshl" d="M120 66L86 92"/>' +
      mark(46, 104, true) + mark(115, 104, false) + label(46, 118, 'closed', 'middle') + label(115, 118, 'hole', 'middle')
  };

  const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const esc = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const svg = (inner, name) => `<svg viewBox="0 0 160 120" role="img" aria-label="Preview: ${esc(name)}">${inner}</svg>`;

  function renderTerms() {
    document.querySelectorAll('.term').forEach(term => {
      const dt = term.querySelector('dt');
      const fn = dt && PV[slug(dt.textContent)];
      if (!fn) return;
      const fig = document.createElement('figure');
      fig.className = 'pv';
      fig.innerHTML = svg(fn(), dt.textContent);
      dt.after(fig);
    });
  }

  window.LampPreview = { lamp: (form, cfg, name) => svg(lamp(form, cfg), name || 'your lamp'), renderTerms, slugs: Object.keys(PV), render: k => PV[k] && svg(PV[k](), k) };
  if (typeof document !== 'undefined') renderTerms();
})();
