(() => {
  "use strict";

  const API_URL = `${(window.APP_CONFIG?.API_BASE_URL || "").replace(/\/$/, "")}/api/ask`;
  const REQUEST_TIMEOUT_MS = 25000;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- Language (AR / EN) ---------------- */
  const STR = {
    ar: { menu: "القائمة", close: "إغلاق", you: "أنت", bot: "المساعد", typing: "يكتب…", online: "متصل", offline: "غير متصل",
      noAnswer: "تعذّر الحصول على إجابة الآن.", none: "لم تصل إجابة.", timeout: "انتهت مهلة الطلب. حاول مرة أخرى.",
      conn: "تعذّر الاتصال بالمساعد حالياً. يمكنك التواصل مع سارة مباشرة عبر Saraalharbi0031@gmail.com",
      thinking: "جارٍ الكتابة", problem: "المشكلة التي يحلّها", repo: "المستودع", link: "رابط", more: "المزيد", less: "أقل", details: "التفاصيل", moreWork: "مشاريع أخرى", systems: "أنظمة متكاملة", showLess: "عرض أقل", sw: "التبديل إلى الإنجليزية" },
    en: { menu: "Menu", close: "Close", you: "You", bot: "Assistant", typing: "Typing…", online: "Online", offline: "Offline",
      noAnswer: "Couldn't get an answer right now.", none: "No answer received.", timeout: "The request timed out. Please try again.",
      conn: "Couldn't reach the assistant right now. You can contact Sara directly at Saraalharbi0031@gmail.com",
      thinking: "Typing", problem: "The problem it solves", repo: "Repository", link: "Link", more: "More", less: "Less", details: "Details", moreWork: "More work", systems: "Full systems", showLess: "Show fewer", sw: "Switch to Arabic" },
  };
  let lang = "ar";
  try { lang = localStorage.getItem("sa-lang") === "en" ? "en" : "ar"; } catch { /* storage unavailable */ }
  const t = (k) => STR[lang][k];
  const langBtn = document.getElementById("lang-toggle");

  // Remember the Arabic originals once, so we can switch back and forth.
  document.querySelectorAll("[data-en]").forEach((el) => { el.dataset.ar = el.innerHTML; });
  document.querySelectorAll("[data-en-ph]").forEach((el) => { el.dataset.arPh = el.getAttribute("placeholder") || ""; });
  const arTitle = document.title;

  function applyLang(l) {
    lang = l;
    const root = document.documentElement;
    root.lang = l;
    root.dir = l === "en" ? "ltr" : "rtl";
    document.querySelectorAll("[data-en]").forEach((el) => { el.innerHTML = l === "en" ? el.dataset.en : el.dataset.ar; });
    document.querySelectorAll("[data-en-ph]").forEach((el) => el.setAttribute("placeholder", l === "en" ? el.dataset.enPh : el.dataset.arPh));
    if (langBtn) { langBtn.textContent = l === "en" ? "عربي" : "EN"; langBtn.setAttribute("aria-label", t("sw")); }
    const tg = document.querySelector(".nav-toggle");
    if (tg) tg.textContent = document.getElementById("site-nav")?.classList.contains("is-open") ? t("close") : t("menu");
    document.querySelectorAll(".msg-user .msg-who").forEach((el) => (el.textContent = t("you")));
    if (!busy) status.textContent = status.classList.contains("is-error") ? t("offline") : t("online");
    document.title = l === "en" ? "Sara Alharbi — Software Engineer" : arTitle;
    try { localStorage.setItem("sa-lang", l); } catch { /* storage unavailable */ }
    renderProjects();
    window.__splitHeads?.();
    const fab = document.getElementById("chat-fab");
    if (fab) fab.textContent = l === "en" ? "Ask Sara" : "اسأل سارة";
  }
  langBtn?.addEventListener("click", () => applyLang(lang === "en" ? "ar" : "en"));

  /* ---------------- Intro (logo animation) ---------------- */
  const intro = document.getElementById("intro");
  if (intro) {
    let seen = false;
    try { seen = sessionStorage.getItem("sa-intro") === "1"; } catch { /* storage unavailable */ }
    if (seen || reduceMotion) {
      intro.classList.add("is-skipped");
    } else {
      document.documentElement.style.overflow = "hidden";
      const finish = () => {
        if (intro.classList.contains("is-done")) return;
        intro.classList.add("is-done");
        document.documentElement.style.overflow = "";
        try { sessionStorage.setItem("sa-intro", "1"); } catch { /* ignore */ }
      };
      const timer = setTimeout(finish, 3300);
      intro.addEventListener("click", () => { clearTimeout(timer); finish(); });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape") { clearTimeout(timer); finish(); } }, { once: true });
    }
  }

  /* ---------------- Footer year ---------------- */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------------- Mobile nav ---------------- */
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("site-nav");

  toggle?.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.textContent = open ? t("close") : t("menu");
  });
  // On mobile the logo doubles as the menu button; on desktop it scrolls to the top.
  const logo = document.getElementById("logo");
  logo?.addEventListener("click", (e) => {
    if (!toggle || !window.matchMedia("(max-width: 760px)").matches) return;
    e.preventDefault();
    toggle.click();
  });
  const syncLogoState = () => logo?.setAttribute("aria-expanded", String(nav.classList.contains("is-open")));
  new MutationObserver(syncLogoState).observe(nav, { attributes: true, attributeFilter: ["class"] });
  nav?.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      nav.classList.remove("is-open");
      toggle?.setAttribute("aria-expanded", "false");
      if (toggle) toggle.textContent = t("menu");
    })
  );

  /* ---------------- Active nav link on scroll ---------------- */
  const links = [...document.querySelectorAll(".site-nav a")];
  const targets = links
    .map((a) => document.querySelector(a.getAttribute("href")))
    .filter(Boolean);

  if ("IntersectionObserver" in window) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = `#${entry.target.id}`;
          links.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === id));
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    targets.forEach((t) => spy.observe(t));

    /* Reveal on scroll */
    if (!reduceMotion) {
      const revealables = document.querySelectorAll(
        ".section-head, .service, .project, .skill-group, .stat, .cert-group-title, .degree, .cert-col, .contact-list li"
      );
      const revealer = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              obs.unobserve(entry.target);
            }
          });
        },
        { rootMargin: "0px 0px 12% 0px" }
      );
      revealables.forEach((el) => {
        el.classList.add("reveal");
        revealer.observe(el);
      });
    }
  }

  /* ---------------- Chat ---------------- */
  const log = document.getElementById("chat-log");
  const form = document.getElementById("chat-form");
  const input = document.getElementById("chat-input");
  const sendBtn = document.getElementById("chat-send");
  const status = document.getElementById("chat-status");
  const chips = document.querySelectorAll("#chat-suggestions .chip");

  let busy = false;

  const escapeHTML = (s) =>
    s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // Turn emails and URLs into links (after escaping).
  const linkify = (text) =>
    escapeHTML(text)
      .replace(
        /\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g,
        '<a href="mailto:$1">$1</a>'
      )
      .replace(
        /(^|[\s(])((?:https?:\/\/)?(?:www\.)?(?:linkedin\.com|github\.com)\/[^\s)،.]+)/g,
        (_, pre, url) => {
          const href = url.startsWith("http") ? url : `https://${url}`;
          return `${pre}<a href="${href}" target="_blank" rel="noopener">${url}</a>`;
        }
      )
      // Strip light markdown emphasis the model might still emit.
      .replace(/\*\*(.+?)\*\*/g, "$1");

  // RTL if the text contains any Arabic; LTR for purely English answers.
  const setDir = (el, text) => {
    el.setAttribute("dir", /[؀-ۿ]/.test(text) || !text ? "rtl" : "ltr");
  };

  const scrollToBottom =() => { log.scrollTop = log.scrollHeight; };

  function addMessage(role, text = "") {
    const wrap = document.createElement("div");
    wrap.className = `msg msg-${role}`;
    const who = document.createElement("span");
    who.className = "msg-who";
    who.textContent = role === "user" ? t("you") : t("bot");
    const p = document.createElement("p");
    p.className = "msg-text";
    setDir(p, text);
    p.textContent = text;
    wrap.append(who, p);
    log.appendChild(wrap);
    scrollToBottom();
    return { wrap, p };
  }

  function showThinking(p) {
    p.innerHTML = `<span class="thinking" aria-label="${t("thinking")}"><span></span><span></span><span></span></span>`;
  }

  async function typeOut(p, text) {
    setDir(p, text);
    if (reduceMotion) {
      p.innerHTML = linkify(text);
      scrollToBottom();
      return;
    }
    p.textContent = "";
    const caret = document.createElement("span");
    caret.className = "caret";
    const node = document.createTextNode("");
    p.append(node, caret);

    // Type by small chunks for a smooth but quick render.
    const chars = [...text];
    const step = Math.max(1, Math.round(chars.length / 180));
    for (let i = 0; i < chars.length; i += step) {
      node.textContent += chars.slice(i, i + step).join("");
      scrollToBottom();
      await new Promise((r) => setTimeout(r, 14));
    }
    p.innerHTML = linkify(text); // final render with links
    scrollToBottom();
  }

  function setBusy(state) {
    busy = state;
    input.disabled = state;
    sendBtn.disabled = state;
    chips.forEach((c) => (c.disabled = state));
    status.classList.toggle("is-busy", state);
    status.classList.remove("is-error");
    status.textContent = state ? t("typing") : t("online");
  }

  async function ask(question) {
    const q = question.trim();
    if (!q || busy) return;

    addMessage("user", q);
    input.value = "";
    setBusy(true);

    const { wrap, p } = addMessage("bot");
    showThinking(p);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
        signal: controller.signal,
      });

      let data = {};
      try { data = await res.json(); } catch { /* non-JSON */ }

      if (!res.ok) {
        const detail = typeof data.detail === "string" ? data.detail : null;
        throw new Error(detail || t("noAnswer"));
      }

      await typeOut(p, data.answer || t("none"));
    } catch (err) {
      wrap.classList.add("msg-error");
      const msg =
        err.name === "AbortError"
          ? t("timeout")
          : err instanceof TypeError
          ? t("conn")
          : err.message;
      p.innerHTML = linkify(msg);
      status.classList.add("is-error");
    } finally {
      clearTimeout(timer);
      const hadError = status.classList.contains("is-error");
      setBusy(false);
      if (hadError) {
        status.classList.add("is-error");
        status.textContent = t("offline");
      }
      input.focus({ preventScroll: true });
    }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    ask(input.value);
  });

  chips.forEach((chip) => chip.addEventListener("click", () => ask(chip.textContent)));

  /* ---------------- Projects (data/projects.json: add new entries there) ---------------- */
  const escHtml = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const safeUrl = (u) => (/^https?:\/\//.test(u) ? escHtml(u) : "#");

  const pick = (p, k) => escHtml(lang === "en" ? p[k + "_en"] : p[k + "_ar"]);
  const linksOf = (p) => (p.links || []).map((l) =>
    `<a href="${safeUrl(l.url)}" target="_blank" rel="noopener">${escHtml((lang === "en" ? l.label_en : l.label_ar) || t("link"))} ↗</a>`).join("");
  const tagsOf = (p) => `<ul class="tags" lang="en" dir="ltr">${(p.tags || []).map((x) => `<li>${escHtml(x)}</li>`).join("")}</ul>`;
  const num = (i) => String(i + 1).padStart(2, "0");

  /* what the screen shows: the screenshot, a pipeline, or a big number */
  function screenArt(p, i) {
    if (p.image) return `<img src="${escHtml(p.image)}" alt="" loading="lazy" />`;
    if (p.flow) {
      return `<div class="scr-art has-flow" lang="en" dir="ltr"><ol>${p.flow.map((f) => `<li>${escHtml(f)}</li>`).join("")}</ol></div>`;
    }
    return `<div class="scr-art has-num"><span lang="en" dir="ltr">${escHtml(p.metric || num(i))}</span>${p.metric ? `<small>${pick(p, "metric")}</small>` : ""}</div>`;
  }

  /* projects with a visual: one tilted screen per row, alternating sides */
  function cine(p, i, total) {
    const metric = p.metric && p.image
      ? `<p class="spot-metric"><strong lang="en" dir="ltr">${escHtml(p.metric)}</strong><span>${pick(p, "metric")}</span></p>` : "";
    const more = p.spotlight
      ? `<p class="spot-solution">${pick(p, "solution")}</p>`
      : `<details class="rail-more"><summary>${t("details")}</summary><p>${pick(p, "solution")}</p></details>`;
    return `<article class="cine">
      <div class="cine-stage" aria-hidden="true"><div class="screen">${screenArt(p, i)}</div></div>
      <div class="cine-body">
        <p class="cine-n"><span lang="en" dir="ltr">${num(i)} / ${String(total).padStart(2, "0")}</span><span>${pick(p, "kind")}</span></p>
        <h3 class="cine-title" lang="en">${escHtml(p.title)}</h3>
        <p class="spot-problem">${pick(p, "problem")}</p>
        ${metric}
        ${more}
        ${tagsOf(p)}
        ${(p.links || []).length ? `<div class="project-links">${linksOf(p)}</div>` : ""}
      </div>
    </article>`;
  }

  /* everything else: one compact line each, opens in place */
  function row(p, i) {
    return `<details class="prow reveal">
      <summary>
        <span class="prow-n" lang="en">${num(i)}</span>
        <span class="prow-title" lang="en">${escHtml(p.title)}</span>
        <span class="prow-kind">${pick(p, "kind")}</span>
        <span class="prow-plus" aria-hidden="true"></span>
      </summary>
      <div class="prow-body">
        <p class="prow-problem">${pick(p, "problem")}</p>
        <p>${pick(p, "solution")}</p>
        ${tagsOf(p)}
        ${(p.links || []).length ? `<div class="project-links">${linksOf(p)}</div>` : ""}
      </div>
    </details>`;
  }

  async function renderProjects() {
    const grid = document.getElementById("projects-grid");
    if (!grid) return;
    try {
      const res = await fetch("data/projects.json", { cache: "no-cache" });
      if (!res.ok) return;
      const items = await res.json();
      const lead = items.filter((p) => p.spotlight);
      const shots = items.filter((p) => !p.spotlight && p.image);
      const rest = items.filter((p) => !p.spotlight && !p.image);
      const screens = [...lead, ...shots];
      grid.innerHTML = `<div class="cines">${screens.map((p, i) => cine(p, i, screens.length)).join("")}</div>` +
        `<h3 class="more-head">${t("moreWork")}</h3><div class="prows">${rest.map((p, i) => row(p, i)).join("")}</div>`;
      grid.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-visible"));
    } catch { /* keep empty */ }
  }
  /* ---------------- Count-up numbers ---------------- */
  const fmt = (el, v) => `${v.toFixed(Number(el.dataset.decimals || 0))}${el.dataset.suffix || ""}`;
  function countUp(el) {
    const target = parseFloat(el.dataset.count);
    if (reduceMotion || !isFinite(target)) return;
    const start = performance.now();
    const tick = (now) => {
      const k = Math.min(1, (now - start) / 1400);
      el.textContent = fmt(el, target * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(tick);
    };
    el.textContent = fmt(el, 0);
    requestAnimationFrame(tick);
  }
  const counters = document.querySelectorAll("[data-count]");
  if ("IntersectionObserver" in window && !reduceMotion) {
    const co = new IntersectionObserver((entries, obs) => entries.forEach((e) => {
      if (e.isIntersecting) { countUp(e.target); obs.unobserve(e.target); }
    }), { threshold: 0.6 });
    counters.forEach((el) => co.observe(el));
  }

  if (lang === "en") applyLang("en"); else renderProjects();
})();


/* ---------- Flip cards (unused now; kept harmless) ---------- */
(() => {
  const flip = (card) => {
    const on = card.classList.toggle("is-flipped");
    card.setAttribute("aria-expanded", String(on));
  };
  document.addEventListener("click", (e) => {
    if (e.target.closest("a")) return;
    const card = e.target.closest(".flipcard");
    if (card) flip(card);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const card = e.target.closest(".flipcard");
    if (card && e.target === card) { e.preventDefault(); flip(card); }
  });
})();

/* ---------- Motion: text reveals, desert parallax, drifting sand, page curtain ---------- */
(() => {
  const soft = window.matchMedia("(prefers-reduced-motion: reduce)").matches; // gentler version, never off
  const root = document.documentElement;
  root.classList.add("js-anim");
  if (soft) root.classList.add("soft");
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));


  /* 0. headlines: words rise out of a mask, one after another */
  const heads = ".hero-title, .section-title, .insight-title, .end-title";
  const wordIO = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add("is-in"); wordIO.unobserve(en.target); }
  }), { rootMargin: "0px 0px -6% 0px", threshold: 0.05 });
  window.__splitHeads = () => {
    document.querySelectorAll(heads).forEach((el) => {
      if (el.querySelector(".w")) return;
      let n = 0;
      const walk = (node) => [...node.childNodes].forEach((c) => {
        if (c.nodeType === 3) {
          const frag = document.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
            const w = document.createElement("span"); w.className = "w";
            const i = document.createElement("span"); i.textContent = part; i.style.transitionDelay = `${n++ * 90}ms`;
            w.appendChild(i); frag.appendChild(w);
          });
          c.replaceWith(frag);
        } else if (c.nodeType === 1 && c.tagName !== "BR") walk(c);
      });
      walk(el);
      el.classList.add("wd");
      el.classList.remove("is-in");
      wordIO.observe(el);
    });
  };
  window.__splitHeads();

  /* 1. text reveals */
  const sel = ".hero-tagline, .hero-subtitle, .hero-actions, .meta-strip, .section-num, .section-lead, .insight-note, .sub-head, .interlude-text, .end-btn, .end-brand, .end-col, .end-bar";
  const els = [...document.querySelectorAll(sel)];
  els.forEach((el) => {
    el.classList.add("tx");
    const sibs = [...el.parentElement.children].filter((c) => c.classList.contains("tx") || els.includes(c));
    el.style.setProperty("--d", `${Math.max(0, sibs.indexOf(el)) * 150}ms`);
  });
  const txIO = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add("is-in"); txIO.unobserve(en.target); }
  }), { rootMargin: "0px 0px -6% 0px", threshold: 0.05 });
  els.forEach((el) => txIO.observe(el));

  /* 2. scroll-driven desert: hero zooms in, interludes slide + scale */
  const hero = document.getElementById("top");
  const inter = [...document.querySelectorAll(".interlude")];
  const dune = document.querySelector(".end-dune");
  let ticking = false;
  const update = () => {
    ticking = false;
    const vh = window.innerHeight;
    if (hero && !soft) root.style.setProperty("--hp", clamp(window.scrollY / hero.offsetHeight).toFixed(3));
    inter.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      el.style.setProperty("--p", clamp((vh - r.top) / (vh + r.height)).toFixed(3));
    });
    if (dune) {
      const r = dune.getBoundingClientRect();
      dune.style.setProperty("--p", clamp((vh - r.top) / (vh + r.height)).toFixed(3));
    }
  };
  window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  window.addEventListener("resize", update);
  update();

  /* 2b. dunes behind the sections: cross-fade per section, drift with the mouse and scroll */
  const layers = [...document.querySelectorAll(".dune-bg i")];
  const secs = [".insight", "#projects", "#skills", "#achievements", "#contact"].map((s) => document.querySelector(s));
  const showLayer = () => {
    const mid = window.innerHeight * 0.5;
    let idx = 0;
    secs.forEach((s, i) => { if (s && s.getBoundingClientRect().top <= mid) idx = i; });
    if (layers.length > 1) layers.forEach((l, i) => l.classList.toggle("on", i === idx));
  };
  window.addEventListener("scroll", showLayer, { passive: true });
  showLayer();
  const mouse = { x: 0, y: 0, tx: 0, ty: 0, px: -999, py: -999, moved: 0 };
  window.addEventListener("pointermove", (e) => {
    mouse.tx = e.clientX / innerWidth - 0.5; mouse.ty = e.clientY / innerHeight - 0.5;
    mouse.moved = Math.hypot(e.clientX - mouse.px, e.clientY - mouse.py); mouse.px = e.clientX; mouse.py = e.clientY;
  }, { passive: true });
  const glide = () => {
    mouse.x += (mouse.tx - mouse.x) * 0.06; mouse.y += (mouse.ty - mouse.y) * 0.06;
    root.style.setProperty("--mx", mouse.x.toFixed(4));
    root.style.setProperty("--my", mouse.y.toFixed(4));
    root.style.setProperty("--sy", String(Math.round(scrollY * 0.06)));
    requestAnimationFrame(glide);
  };
  if (!soft) requestAnimationFrame(glide);

  /* 3. drifting sand (wind) */
  const cv = document.createElement("canvas");
  cv.className = "dust"; cv.setAttribute("aria-hidden", "true");
  document.body.appendChild(cv);
  const ctx = cv.getContext("2d");
  let W = 0, H = 0, dpr = 1;
  const size = () => { dpr = Math.min(window.devicePixelRatio || 1, 1.5); W = cv.width = innerWidth * dpr; H = cv.height = innerHeight * dpr; };
  size(); window.addEventListener("resize", size);
  const N = soft ? 60 : innerWidth < 700 ? 45 : 95;
  const P = Array.from({ length: N }, () => ({
    x: Math.random(), y: Math.random(), z: 0.3 + Math.random() * 0.9, s: 0.6 + Math.random() * 1.8,
    a: 0.15 + Math.random() * 0.5, ph: Math.random() * 6.28, vx: 0, vy: 0,
  }));
  let lastY = scrollY, t0 = performance.now();
  const frame = (t) => {
    const dt = (Math.min(50, t - t0) / 16.7) * (soft ? 0.55 : 1); t0 = t; mouse.moved *= 0.9;
    const dy = (scrollY - lastY) / innerHeight; lastY = scrollY;
    ctx.clearRect(0, 0, W, H);
    for (const p of P) {
      p.x += (0.0009 * p.z + Math.abs(dy) * 0.05) * dt;          // wind to the right, gusting on scroll
      p.y += Math.sin(t / 1600 + p.ph) * 0.00035 * dt - dy * 0.35 * p.z;
      const ddx = p.x * innerWidth - mouse.px, ddy = p.y * innerHeight - mouse.py, d2 = ddx * ddx + ddy * ddy;
      if (d2 < 22500) {                                           // within ~150px of the cursor: blown away
        const f = (1 - Math.sqrt(d2) / 150) * Math.min(1, 0.25 + mouse.moved / 40) * 0.0045;
        p.vx += (ddx / (Math.sqrt(d2) + 1)) * f; p.vy += (ddy / (Math.sqrt(d2) + 1)) * f;
      }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96;
      if (p.x > 1.02) p.x = -0.02; else if (p.x < -0.02) p.x = 1.02;
      if (p.y > 1.02) p.y = -0.02; else if (p.y < -0.02) p.y = 1.02;
      ctx.globalAlpha = p.a;
      ctx.fillStyle = "#f2f2ee";
      ctx.fillRect(p.x * W, p.y * H, p.s * dpr * p.z * 1.4, p.s * dpr * p.z * 0.9);
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  if (soft) return;

  /* 4. page curtain when jumping between sections */
  const cur = document.createElement("div");
  cur.className = "curtain"; cur.setAttribute("aria-hidden", "true");
  cur.innerHTML = '<img src="img/logo-letters-white.png" alt="" />';
  document.body.appendChild(cur);
  let busy = false;
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || busy || e.defaultPrevented || e.metaKey || e.ctrlKey) return;
    const id = a.getAttribute("href");
    const target = id.length > 1 ? document.querySelector(id) : null;
    if (!target) return;
    e.preventDefault();
    busy = true;
    cur.className = "curtain on";
    setTimeout(() => {
      root.style.scrollBehavior = "auto";
      target.scrollIntoView({ block: "start" });
      history.replaceState(null, "", id);
      update();
      cur.className = "curtain out";
      setTimeout(() => { root.style.scrollBehavior = ""; cur.className = "curtain"; busy = false; }, 650);
    }, 520);
  });
})();

/* ---------- Cinema: hero lifts away, "step into the work" zoom, tilted project screens ---------- */
(() => {
  const soft = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const narrow = window.matchMedia("(max-width: 900px)");
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = (k) => k * k * (3 - 2 * k);
  const intro = document.getElementById("frame-intro");
  const box = intro?.querySelector(".fi-screen");
  const copy = intro?.querySelector(".fi-copy");
  const rows = document.getElementsByClassName("cine");

  if (soft) { intro?.classList.add("is-static"); return; }

  const frame = () => {
    const vw = document.documentElement.clientWidth, vh = innerHeight;

    if (box && copy) {
      const r = intro.getBoundingClientRect();
      if (r.bottom > 0 && r.top < vh) {
        const p = clamp(-r.top / (r.height - vh));
        const k = ease(clamp((p - 0.08) / 0.72));
        const w0 = Math.min(vw * (narrow.matches ? 0.86 : 0.46), 700), h0 = (w0 * 10) / 16;
        const y0 = vh * 0.74 - h0 / 2;
        const w = w0 + (vw - w0) * k, h = h0 + (vh - h0) * k;
        Object.assign(box.style, {
          width: `${w}px`, height: `${h}px`, left: `${(vw - w) / 2}px`, top: `${y0 * (1 - k)}px`,
          transform: `rotateX(${(1 - k) * 16}deg)`, borderRadius: `${(1 - k) * 16}px`,
        });
        box.style.setProperty("--dim", (clamp((p - 0.7) / 0.3) * 0.6).toFixed(3));
        const c = clamp((p - 0.1) / 0.4);
        copy.style.opacity = (1 - c).toFixed(3);
        copy.style.transform = `translate3d(0, ${-c * 12}vh, 0) scale(${1 + c * 0.5})`;
      }
    }

    for (const row of rows) {
      const r = row.getBoundingClientRect();
      if (r.bottom < -50 || r.top > vh + 50) continue;
      const c = clamp((r.top + r.height / 2 - vh / 2) / vh, -1, 1); // 0 when the row is centred
      const scr = row.querySelector(".screen");
      row.style.setProperty("--c", c.toFixed(3));
      if (narrow.matches) {
        scr.style.transform = `rotateX(${c * 18}deg) scale(${1 - Math.abs(c) * 0.08})`;
        continue;
      }
      const st = scr.parentElement.getBoundingClientRect();
      const side = st.left + st.width / 2 < vw / 2 ? 1 : -1; // turn the screen towards the text
      scr.style.transform = `translate3d(0, ${c * 40}px, 0) rotateY(${side * (9 + Math.abs(c) * 22)}deg) rotateX(${c * 6}deg) scale(${1 - Math.abs(c) * 0.1})`;
    }
  };
  let ticking = false;
  const req = () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; frame(); }); } };
  addEventListener("scroll", req, { passive: true });
  addEventListener("resize", req);
  new MutationObserver(req).observe(document.getElementById("projects-grid") || document.body, { childList: true });
  frame();
})();
