/* Rotating, dissolving isometric pixel cube (canvas, no dependencies). */
(() => {
  "use strict";
  const canvas = document.getElementById("cube");
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const N = 8;
  const H2 = N / 2;
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  // Build voxels: a shell that dissolves toward one corner, plus a few floating blocks.
  const key = (i, j, k) => `${i},${j},${k}`;
  const solid = new Set();
  const voxels = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) for (let k = 0; k < N; k++) {
    const shell = i === 0 || j === 0 || k === 0 || i === N - 1 || j === N - 1 || k === N - 1;
    if (!shell) { solid.add(key(i, j, k)); voxels.push({ i, j, k, inner: true, ph: 0, float: false }); continue; }
    const d = (i / (N - 1) + j / (N - 1) + (1 - k / (N - 1))) / 3;
    if (rnd() > 0.1 + 0.36 * d * d) {
      solid.add(key(i, j, k));
      voxels.push({ i, j, k, inner: false, ph: rnd() * 6.28, breathe: rnd() < 0.35, float: false });
    }
  }
  for (let n = 0; n < 24; n++) {
    voxels.push({
      i: Math.floor(rnd() * (N + 6)) - 3, j: Math.floor(rnd() * (N + 6)) - 3, k: N + Math.floor(rnd() * 4) - 1,
      inner: false, ph: rnd() * 6.28, float: true, breathe: false,
    });
  }

  // Faces in (i, j, k) grid space; k is "up". Each: neighbor offset + 4 corner offsets.
  const GRID_FACES = [
    { off: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
    { off: [0, 0, -1], c: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]] },
    { off: [1, 0, 0], c: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] },
    { off: [-1, 0, 0], c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
    { off: [0, 1, 0], c: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]] },
    { off: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  ];

  const TILT = (26 * Math.PI) / 180;
  const cosT = Math.cos(TILT), sinT = Math.sin(TILT);
  const light = (() => { const l = [-0.45, 0.75, 0.5]; const m = Math.hypot(...l); return l.map((v) => v / m); })();
  const BASE = [118, 172, 206];

  let w = 0, h = 0, scale = 1, dpr = 1;
  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = Math.max(1, Math.round(r.width)); h = Math.max(1, Math.round(r.height));
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scale = Math.min(w, h) / (N * 1.75);
  }

  // grid (x right, y up, z toward viewer) -> view space
  function view(px, py, pz, cy, sy) {
    const x = px * cy + pz * sy;
    const z = -px * sy + pz * cy;
    return [x, py * cosT - z * sinT, py * sinT + z * cosT];
  }

  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    const ang = t * 0.00022;                       // slow continuous spin
    const cy = Math.cos(ang), sy = Math.sin(ang);
    const faces = [];
    for (const v of voxels) {
      let a = 1;
      if (v.breathe) a = 0.5 + 0.5 * Math.sin(t * 0.0011 + v.ph);
      if (v.float) a = 0.55 + 0.45 * Math.sin(t * 0.0013 + v.ph);
      if (a < 0.2) continue;
      const bob = v.float ? Math.sin(t * 0.0016 + v.ph) * 0.35 : 0;
      for (const f of GRID_FACES) {
        if (!v.float && solid.has(key(v.i + f.off[0], v.j + f.off[1], v.k + f.off[2]))) continue;
        const nv = view(f.off[0], f.off[2], f.off[1], cy, sy);   // normal: x=i, y=k(up), z=j
        if (nv[2] <= 0.02) continue;
        const pts = f.c.map((c) => view(v.i + c[0] - H2, v.k + c[2] - H2 + bob, v.j + c[1] - H2, cy, sy));
        const depth = (pts[0][2] + pts[2][2]) / 2;
        const lum = 0.5 + 0.8 * Math.max(0, nv[0] * light[0] + nv[1] * light[1] + nv[2] * light[2]);
        faces.push({ pts, depth, lum, a });
      }
    }
    faces.sort((p, q) => p.depth - q.depth);
    const ox = w / 2, oy = h / 2;
    ctx.lineJoin = "round";
    for (const f of faces) {
      const k = Math.min(1.25, f.lum);
      ctx.globalAlpha = f.a;
      ctx.fillStyle = `rgb(${Math.min(255, BASE[0] * k) | 0},${Math.min(255, BASE[1] * k) | 0},${Math.min(255, BASE[2] * k) | 0})`;
      ctx.strokeStyle = "rgba(6,18,27,.6)";
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      f.pts.forEach((p, n) => { const X = ox + p[0] * scale, Y = oy - p[1] * scale; n ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  let raf = 0, running = false;
  const loop = (t) => { draw(t); raf = requestAnimationFrame(loop); };
  const start = () => { if (!running && !reduce) { running = true; raf = requestAnimationFrame(loop); } };
  const stop = () => { running = false; cancelAnimationFrame(raf); };

  resize();
  draw(1500);
  window.addEventListener("resize", () => { resize(); draw(1500); });
  if (reduce) return;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? start() : stop())), { threshold: 0 }).observe(canvas);
  } else start();
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
})();
