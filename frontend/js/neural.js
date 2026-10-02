/*
 * Page-wide neural-network background.
 *  - one fixed canvas behind the whole page
 *  - a rotating 3D neural sphere in the hero
 *  - a faint drifting particle mesh reacts to the pointer
 * Signals travel input -> output through each network and light the nodes they pass.
 */
(() => {
  "use strict";

  const hero = document.getElementById("top");
  const slot = hero?.querySelector(".net-slot");
  if (!hero || !slot) return;

  const cv = document.createElement("canvas");
  cv.className = "page-canvas";
  cv.setAttribute("aria-hidden", "true");
  document.body.prepend(cv);
  const ctx = cv.getContext("2d");

  let W = 0, H = 0, dpr = 1, scrollY = 0;
  let nets = [], mesh = [], sphere = null;
  let colors = { ink: "#241914", accent: "#755B4B", line: "#574338" };
  let running = false, paused = false, raf = 0, last = 0;
  const mouse = { x: -9999, y: -9999 }; // page coordinates

  const rand = (a, b) => a + Math.random() * (b - a);

  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    const get = (n, d) => cs.getPropertyValue(n).trim() || d;
    colors = { ink: get("--text-dark", "#241914"), accent: get("--accent-walnut", "#755B4B"), line: get("--text-muted", "#574338") };
  }

  /* ---------------- feed-forward network ---------------- */
  function makeNet({ x, y, w, h, layers, alpha, scale, speed }) {
    const nodes = [];
    layers.forEach((count, li) => {
      const nx = x + (layers.length === 1 ? w / 2 : (w * li) / (layers.length - 1));
      for (let k = 0; k < count; k++) {
        const ny = y + (count === 1 ? h / 2 : (h * k) / (count - 1));
        nodes.push({ l: li, bx: nx, by: ny, x: nx, y: ny, px: rand(0, 6.28), py: rand(0, 6.28), act: 0 });
      }
    });
    const byLayer = layers.map((_, li) => nodes.filter((n) => n.l === li));
    const edges = [];
    for (let li = 0; li < layers.length - 1; li++) {
      byLayer[li].forEach((a) => byLayer[li + 1].forEach((b) => edges.push({ a, b, glow: 0 })));
    }
    return { nodes, byLayer, edges, signals: [], alpha, scale, speed: speed || 1, spawn: rand(0, 1), top: y - 30, bottom: y + h + 30 };
  }

  function spawnSignal(net) {
    const path = [net.byLayer[0][Math.floor(Math.random() * net.byLayer[0].length)]];
    for (let li = 1; li < net.byLayer.length; li++) {
      const layer = net.byLayer[li];
      path.push(layer[Math.floor(Math.random() * layer.length)]);
    }
    net.signals.push({ path, seg: 0, t: 0 });
  }

  function updateNet(net, dt, time) {
    const amp = 5 * net.scale;
    net.nodes.forEach((n) => {
      n.x = n.bx + Math.sin(time * 0.0007 * net.speed + n.px) * amp;
      n.y = n.by + Math.cos(time * 0.0009 * net.speed + n.py) * amp;
      const dx = mouse.x - n.x, dy = mouse.y - n.y, d = Math.hypot(dx, dy);
      if (d < 140) {
        n.act = Math.max(n.act, 1 - d / 140);
        n.x += (dx / (d || 1)) * (1 - d / 140) * 10;
        n.y += (dy / (d || 1)) * (1 - d / 140) * 10;
      }
      n.act = Math.max(0, n.act - dt * 0.0011);
    });
    net.edges.forEach((e) => { e.glow = Math.max(0, e.glow - dt * 0.0012); });

    net.spawn -= dt * 0.001 * net.speed;
    if (net.spawn <= 0) { spawnSignal(net); net.spawn = rand(0.35, 0.9); }

    net.signals = net.signals.filter((s) => {
      s.t += dt * 0.0011 * net.speed;
      const a = s.path[s.seg], b = s.path[s.seg + 1];
      const edge = net.edges.find((e) => e.a === a && e.b === b);
      if (edge) edge.glow = 1;
      if (s.t >= 1) {
        b.act = 1;
        s.seg += 1; s.t = 0;
        if (s.seg >= s.path.length - 1) return false;
      }
      return true;
    });
  }

  function drawNet(net) {
    ctx.save();
    ctx.lineCap = "round";
    net.edges.forEach((e) => {
      const on = e.glow > 0.02;
      ctx.beginPath();
      ctx.moveTo(e.a.x, e.a.y);
      ctx.lineTo(e.b.x, e.b.y);
      ctx.strokeStyle = on ? colors.accent : colors.line;
      ctx.globalAlpha = net.alpha * (on ? 0.35 + e.glow * 0.65 : 0.22);
      ctx.lineWidth = (on ? 1.2 + e.glow * 1.4 : 1) * net.scale;
      ctx.stroke();
    });
    net.signals.forEach((s) => {
      const a = s.path[s.seg], b = s.path[s.seg + 1];
      ctx.globalAlpha = net.alpha;
      ctx.beginPath();
      ctx.arc(a.x + (b.x - a.x) * s.t, a.y + (b.y - a.y) * s.t, 3.2 * net.scale, 0, 6.283);
      ctx.fillStyle = colors.accent;
      ctx.fill();
    });
    const lastLayer = net.byLayer.length - 1;
    net.nodes.forEach((n) => {
      const r = (4.5 + n.act * 4) * net.scale;
      if (n.act > 0.05) {
        ctx.globalAlpha = net.alpha * n.act * 0.35;
        ctx.beginPath(); ctx.arc(n.x, n.y, r * 2.4, 0, 6.283); ctx.fillStyle = colors.accent; ctx.fill();
      }
      ctx.globalAlpha = net.alpha;
      ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, 6.283);
      ctx.fillStyle = n.l === lastLayer ? colors.accent : colors.ink;
      ctx.fill();
    });
    ctx.restore();
  }


  /* ---------------- rotating 3D neural sphere (hero) ---------------- */
  function makeSphere(cx, cy, R) {
    const N = R > 150 ? 86 : 60;
    const golden = Math.PI * (3 - Math.sqrt(5));
    const pts = [];
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      pts.push({ x: Math.cos(golden * i) * r, y, z: Math.sin(golden * i) * r, act: 0, hot: i % 7 === 0 });
    }
    const edges = [], adj = pts.map(() => []), map = new Map();
    pts.forEach((p, i) => {
      pts
        .map((q, j) => ({ j, d: (p.x - q.x) ** 2 + (p.y - q.y) ** 2 + (p.z - q.z) ** 2 }))
        .filter((o) => o.j !== i)
        .sort((a, b) => a.d - b.d)
        .slice(0, 3)
        .forEach((o) => {
          const key = i < o.j ? `${i}-${o.j}` : `${o.j}-${i}`;
          if (map.has(key)) return;
          const e = { a: i, b: o.j, glow: 0 };
          map.set(key, e); edges.push(e); adj[i].push(o.j); adj[o.j].push(i);
        });
    });
    return { cx, cy, R, pts, edges, adj, map, signals: [], spawn: 0, rot: rand(0, 6.28), mx: 0, my: 0, top: cy - R * 1.4, bottom: cy + R * 1.4 };
  }

  function updateSphere(sp, dt, time) {
    sp.rot += dt * 0.00018;
    const tx = Math.max(-1, Math.min(1, (mouse.x - sp.cx) / 500)) * 0.5;
    const ty = Math.max(-1, Math.min(1, (mouse.y - sp.cy) / 400)) * 0.35;
    sp.mx += (tx - sp.mx) * 0.04;
    sp.my += (ty - sp.my) * 0.04;
    const a = sp.rot + sp.mx, b = 0.38 + sp.my;
    const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
    sp.pts.forEach((p) => {
      const x1 = p.x * ca + p.z * sa;
      const z1 = -p.x * sa + p.z * ca;
      const y2 = p.y * cb - z1 * sb;
      const z2 = p.y * sb + z1 * cb;
      const sc = 1 / (1 - z2 * 0.32);
      p.sx = sp.cx + x1 * sp.R * sc;
      p.sy = sp.cy + y2 * sp.R * sc;
      p.t = (z2 + 1) / 2;
      p.sc = sc;
      const dx = mouse.x - p.sx, dy = mouse.y - p.sy, d = Math.hypot(dx, dy);
      if (d < 110) p.act = Math.max(p.act, 1 - d / 110);
      p.act = Math.max(0, p.act - dt * 0.0011);
    });
    sp.edges.forEach((e) => { e.glow = Math.max(0, e.glow - dt * 0.0011); });

    sp.spawn -= dt * 0.001;
    if (sp.spawn <= 0) {
      const from = Math.floor(Math.random() * sp.pts.length);
      sp.signals.push({ from, to: sp.adj[from][Math.floor(Math.random() * sp.adj[from].length)], t: 0, hops: 0, prev: -1 });
      sp.spawn = rand(0.12, 0.35);
    }
    sp.signals = sp.signals.filter((sg) => {
      sg.t += dt * 0.0016;
      const key = sg.from < sg.to ? `${sg.from}-${sg.to}` : `${sg.to}-${sg.from}`;
      const e = sp.map.get(key); if (e) e.glow = 1;
      if (sg.t >= 1) {
        sp.pts[sg.to].act = 1;
        sg.hops += 1;
        if (sg.hops >= 7) return false;
        const options = sp.adj[sg.to].filter((n) => n !== sg.from);
        const next = (options.length ? options : sp.adj[sg.to])[Math.floor(Math.random() * (options.length || sp.adj[sg.to].length))];
        sg.prev = sg.from; sg.from = sg.to; sg.to = next; sg.t = 0;
      }
      return true;
    });
    sp.time = time;
  }

  function drawSphere(sp) {
    const { cx, cy, R } = sp;
    ctx.save();
    ctx.lineCap = "round";
    // silhouette + orbits
    ctx.strokeStyle = colors.line;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.16;
    ctx.beginPath(); ctx.arc(cx, cy, R * 1.02, 0, 6.283); ctx.stroke();
    const tm = sp.time || 0;
    [[1.32, 0.3, 0.5, 0.00021], [1.2, 0.22, -0.6, -0.00028]].forEach(([rx, ry, rot0, speed], k) => {
      const rot = rot0 + tm * speed * 0.3;
      ctx.globalAlpha = 0.2;
      ctx.beginPath(); ctx.ellipse(cx, cy, R * rx, R * ry, rot, 0, 6.283); ctx.stroke();
      const ang = tm * 0.0006 * (k ? -1 : 1) + k * 2;
      const ox = Math.cos(ang) * R * rx, oy = Math.sin(ang) * R * ry;
      const px = cx + ox * Math.cos(rot) - oy * Math.sin(rot), py = cy + ox * Math.sin(rot) + oy * Math.cos(rot);
      ctx.globalAlpha = 0.25; ctx.fillStyle = colors.accent;
      ctx.beginPath(); ctx.arc(px, py, 11, 0, 6.283); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.arc(px, py, 4.2, 0, 6.283); ctx.fill();
    });

    // edges
    sp.edges.forEach((e) => {
      const a = sp.pts[e.a], b = sp.pts[e.b];
      const on = e.glow > 0.02;
      ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy);
      ctx.strokeStyle = on ? colors.accent : colors.line;
      ctx.globalAlpha = on ? 0.4 + e.glow * 0.6 : 0.07 + 0.38 * ((a.t + b.t) / 2);
      ctx.lineWidth = on ? 1.3 + e.glow * 1.5 : 1;
      ctx.stroke();
    });
    // travelling signals
    sp.signals.forEach((sg) => {
      const a = sp.pts[sg.from], b = sp.pts[sg.to];
      ctx.globalAlpha = 0.95; ctx.fillStyle = colors.accent;
      ctx.beginPath(); ctx.arc(a.sx + (b.sx - a.sx) * sg.t, a.sy + (b.sy - a.sy) * sg.t, 3.4, 0, 6.283); ctx.fill();
    });
    // nodes (back to front)
    [...sp.pts].sort((p, q) => p.t - q.t).forEach((p) => {
      const r = (2.2 + 3.2 * p.t) * p.sc + p.act * 4.5;
      if (p.act > 0.05) {
        ctx.globalAlpha = p.act * 0.35; ctx.fillStyle = colors.accent;
        ctx.beginPath(); ctx.arc(p.sx, p.sy, r * 2.5, 0, 6.283); ctx.fill();
      }
      ctx.globalAlpha = 0.3 + 0.7 * p.t;
      ctx.fillStyle = p.hot ? colors.accent : colors.ink;
      ctx.beginPath(); ctx.arc(p.sx, p.sy, r, 0, 6.283); ctx.fill();
    });
    ctx.restore();
  }

  /* ---------------- drifting particle mesh (follows the viewport) ---------------- */
  function makeMesh() {
    const count = Math.round(Math.min(46, Math.max(18, (W * H) / 22000)));
    mesh = Array.from({ length: count }, () => ({
      x: rand(0, W), y: rand(0, H), vx: rand(-0.04, 0.04), vy: rand(-0.04, 0.04), r: rand(1.4, 2.4),
    }));
  }
  function updateMesh(dt) {
    const my = mouse.y - scrollY;
    mesh.forEach((p) => {
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x < -20) p.x = W + 20; if (p.x > W + 20) p.x = -20;
      if (p.y < -20) p.y = H + 20; if (p.y > H + 20) p.y = -20;
      const dx = p.x - mouse.x, dy = p.y - my, d = Math.hypot(dx, dy);
      if (d < 120) { p.x += (dx / (d || 1)) * 0.6; p.y += (dy / (d || 1)) * 0.6; }
    });
  }
  function drawMesh() {
    ctx.save();
    ctx.lineWidth = 1;
    for (let i = 0; i < mesh.length; i++) {
      for (let j = i + 1; j < mesh.length; j++) {
        const d = Math.hypot(mesh[i].x - mesh[j].x, mesh[i].y - mesh[j].y);
        if (d < 130) {
          ctx.globalAlpha = (1 - d / 130) * 0.16;
          ctx.strokeStyle = colors.line;
          ctx.beginPath(); ctx.moveTo(mesh[i].x, mesh[i].y); ctx.lineTo(mesh[j].x, mesh[j].y); ctx.stroke();
        }
      }
    }
    ctx.fillStyle = colors.line;
    mesh.forEach((p) => { ctx.globalAlpha = 0.28; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill(); });
    ctx.restore();
  }

  /* ---------------- layout (page coordinates) ---------------- */
  const pageRect = (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top + window.scrollY, w: r.width, h: r.height };
  };

  function layout() {
    scrollY = window.scrollY;
    W = window.innerWidth; H = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const narrow = W < 760;
    const rtl = document.documentElement.dir === "rtl";
    const sr = pageRect(slot);
    const list = [];

    /* hero: one rotating neural sphere inside the slot */
    const R = Math.max(80, Math.min(sr.w, sr.h) / 2 - 22);
    sphere = makeSphere(sr.x + sr.w / 2, sr.y + sr.h / 2, R);


    nets = list.map(makeNet);
    makeMesh();
  }

  /* ---------------- loop ---------------- */
  function renderFrame(dt, now) {
    scrollY = window.scrollY;
    ctx.clearRect(0, 0, W, H);
    if (dt) updateMesh(dt);
    drawMesh();
    ctx.save();
    ctx.translate(0, -scrollY);
    if (sphere && !(sphere.bottom < scrollY - 20 || sphere.top > scrollY + H + 20)) {
      if (dt) updateSphere(sphere, dt, now);
      drawSphere(sphere);
    }
    nets.forEach((n) => {
      if (n.bottom < scrollY - 20 || n.top > scrollY + H + 20) return;
      if (dt) updateNet(n, dt, now);
      drawNet(n);
    });
    ctx.restore();
  }
  function frame(now) {
    raf = 0;
    if (!running) return;
    const dt = Math.min(48, now - (last || now));
    last = now;
    renderFrame(dt, now);
    raf = requestAnimationFrame(frame);
  }
  function start() { if (running || paused || document.hidden) return; running = true; last = 0; raf = requestAnimationFrame(frame); }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
  const redrawStatic = () => { if (!running) renderFrame(0, 0); };

  /* ---------------- wiring ---------------- */
  readColors(); layout(); start();

  let relayoutT = 0;
  const relayout = () => { clearTimeout(relayoutT); relayoutT = setTimeout(() => { layout(); redrawStatic(); }, 150); };
  new ResizeObserver(relayout).observe(document.body);
  window.addEventListener("resize", relayout);
  // headings move when the language flips (dir changes) or text re-wraps
  new MutationObserver(relayout).observe(document.documentElement, { attributes: true, attributeFilter: ["dir", "lang"] });
  new MutationObserver(() => { readColors(); redrawStatic(); }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  window.addEventListener("scroll", redrawStatic, { passive: true });

  window.addEventListener("pointermove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY + window.scrollY; }, { passive: true });
  document.addEventListener("pointerleave", () => { mouse.x = mouse.y = -9999; });

  // Pause / play from the header motion toggle
  window.__setNetPaused = (state) => { paused = state; state ? stop() : start(); };
})();
