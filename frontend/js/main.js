(() => {
  "use strict";

  const API_URL = `${(window.APP_CONFIG?.API_BASE_URL || "").replace(/\/$/, "")}/api/ask`;
  const REQUEST_TIMEOUT_MS = 25000;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.documentElement;
  root.classList.add("js");

  const store = {
    get(k, s = localStorage) { try { return s.getItem(k); } catch { return null; } },
    set(k, v, s = localStorage) { try { s.setItem(k, v); } catch { /* storage unavailable */ } },
  };
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  /* ---------------- Language (AR / EN) ---------------- */
  const STR = {
    ar: { menu: "القائمة", close: "إغلاق", you: "أنت", bot: "المساعد", typing: "يكتب…", online: "متصل", offline: "غير متصل",
      noAnswer: "تعذّر الحصول على إجابة الآن.", none: "لم تصل إجابة.", timeout: "انتهت مهلة الطلب. حاول مرة أخرى.",
      conn: "تعذّر الاتصال بالمساعد حالياً. يمكنك التواصل مع سارة مباشرة عبر Saraalharbi0031@gmail.com",
      thinking: "جارٍ الكتابة", link: "رابط", sw: "التبديل إلى الإنجليزية",
      open: "افتح المشروع", show: "اعرض المشروع", view: "عرض المشروع", discipline: "المجال", stack: "التقنيات",
      cover: "الغلاف", poster: "ملصق المشروع", ui: "الواجهة", screen: "الشاشة الرئيسية", arch: "المعمارية", flow: "تدفق البيانات",
      next: "المشروع التالي", priv: "المستودع غير منشور", home: "سارة الحربي — الصفحة الرئيسية" },
    en: { menu: "Menu", close: "Close", you: "You", bot: "Assistant", typing: "Typing…", online: "Online", offline: "Offline",
      noAnswer: "Couldn't get an answer right now.", none: "No answer received.", timeout: "The request timed out. Please try again.",
      conn: "Couldn't reach the assistant right now. You can contact Sara directly at Saraalharbi0031@gmail.com",
      thinking: "Typing", link: "Link", sw: "Switch to Arabic",
      open: "Open project", show: "Show project", view: "View project", discipline: "Discipline", stack: "Stack",
      cover: "Cover", poster: "Project poster", ui: "Interface", screen: "Main screen", arch: "Architecture", flow: "Data flow",
      next: "Next project", priv: "Private repository", home: "Sara Alharbi — home" },
  };
  let lang = store.get("sa-lang") === "en" ? "en" : "ar";
  const t = (k) => STR[lang][k];
  const langBtn = document.getElementById("lang-toggle");

  // Remember the Arabic originals once, so we can switch back and forth.
  document.querySelectorAll("[data-en]").forEach((el) => { el.dataset.ar = el.innerHTML; });
  document.querySelectorAll("[data-en-ph]").forEach((el) => { el.dataset.arPh = el.getAttribute("placeholder") || ""; });
  const arTitle = document.title;

  /* ---------------- Letter roll ----------------
     Each letter is stacked twice and slides up on hover, 20ms apart. Arabic letters join,
     so Arabic labels roll as one piece. The visible copy is hidden from screen readers. */
  function setRoll(el, text) {
    el.setAttribute("aria-label", text);
    const parts = /[؀-ۿ]/.test(text) ? [text] : Array.from(text);
    el.innerHTML = `<span class="roll" aria-hidden="true">${parts.map((c, i) => {
      const ch = escHtml(c === " " ? " " : c);
      return `<span class="roll-char"><span class="roll-stack" style="--i:${i}"><span>${ch}</span><span>${ch}</span></span></span>`;
    }).join("")}</span>`;
  }
  const buildRolls = () => document.querySelectorAll("[data-roll]").forEach((el) => setRoll(el, el.textContent.trim()));

  function applyLang(l) {
    lang = l;
    root.lang = l;
    root.dir = l === "en" ? "ltr" : "rtl";
    document.querySelectorAll("[data-en]").forEach((el) => { el.innerHTML = l === "en" ? el.dataset.en : el.dataset.ar; });
    document.querySelectorAll("[data-en-ph]").forEach((el) => el.setAttribute("placeholder", l === "en" ? el.dataset.enPh : el.dataset.arPh));
    buildRolls();
    if (langBtn) { setRoll(langBtn, l === "en" ? "عربي" : "EN"); langBtn.setAttribute("aria-label", t("sw")); }
    document.querySelector(".logo")?.setAttribute("aria-label", t("home"));
    if (toggle) setRoll(toggle, nav.classList.contains("is-open") ? t("close") : t("menu"));
    document.querySelectorAll(".msg-user .msg-who").forEach((el) => (el.textContent = t("you")));
    if (!busy) status.textContent = status.classList.contains("is-error") ? t("offline") : t("online");
    document.title = l === "en" ? "Sara Alharbi — Software Engineer" : arTitle;
    store.set("sa-lang", l);
    renderWorks();
  }
  langBtn?.addEventListener("click", () => applyLang(lang === "en" ? "ar" : "en"));

  /* ---------------- Opening counter (00 → 100) ---------------- */
  const opening = document.getElementById("opening");
  if (opening) {
    if (store.get("sa-intro", sessionStorage) === "1" || reduceMotion) {
      opening.classList.add("is-skipped");
    } else {
      const n = document.getElementById("opening-n");
      root.style.overflow = "hidden";
      const start = performance.now();
      const done = () => {
        if (opening.classList.contains("is-done")) return;
        opening.classList.add("is-done");
        root.style.overflow = "";
        store.set("sa-intro", "1", sessionStorage);
        setTimeout(() => opening.classList.add("is-skipped"), 900);
      };
      const tick = (now) => {
        const k = Math.min(1, (now - start) / 1200);
        n.textContent = String(Math.round(100 * (1 - Math.pow(1 - k, 3)))).padStart(2, "0");
        if (k < 1) requestAnimationFrame(tick); else setTimeout(done, 200);
      };
      requestAnimationFrame(tick);
      opening.addEventListener("click", done);
    }
  }

  /* ---------------- Footer year ---------------- */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------------- Header & mobile nav ---------------- */
  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("site-nav");
  const syncHeader = () => header.classList.toggle("is-solid", window.scrollY > 40);
  window.addEventListener("scroll", syncHeader, { passive: true });
  syncHeader();

  const setMenu = (open) => {
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    setRoll(toggle, open ? t("close") : t("menu"));
    root.style.overflow = open ? "hidden" : "";
  };
  toggle?.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));
  nav?.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => nav.classList.contains("is-open") && setMenu(false)));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && nav.classList.contains("is-open")) setMenu(false); });

  /* ---------------- Active nav link on scroll ---------------- */
  const links = [...document.querySelectorAll(".site-nav a")];
  const spy = new IntersectionObserver(
    (entries) => entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const id = `#${entry.target.id}`;
      links.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === id));
    }),
    { rootMargin: "-45% 0px -50% 0px" }
  );
  links.map((a) => document.querySelector(a.getAttribute("href"))).filter(Boolean).forEach((s) => spy.observe(s));

  /* ---------------- Reveal on scroll ---------------- */
  const revealIO = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("is-in"); revealIO.unobserve(e.target); }
    }),
    { rootMargin: "0px 0px -8% 0px" }
  );
  const observeReveals = (scope = document) => scope.querySelectorAll(".reveal:not(.is-in)").forEach((el) => revealIO.observe(el));
  document.querySelectorAll(".section-head, .stat, .step, .degree, .cert-row, .end-cta, .end-grid").forEach((el) => {
    el.classList.add("reveal");
    const sibs = [...el.parentElement.children];
    el.style.setProperty("--d", `${Math.min(sibs.indexOf(el), 4) * 70}ms`);
  });
  observeReveals();

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

  const scrollToBottom = () => { log.scrollTop = log.scrollHeight; };

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

  /* =========================================================
     Works (data/projects.json: add new entries there)
     ========================================================= */
  function escHtml(v) {
    return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  const safeUrl = (u) => (/^https?:\/\//.test(u) ? escHtml(u) : "#");
  const pick = (p, k) => escHtml(lang === "en" ? p[k + "_en"] : p[k + "_ar"]);
  const pad = (n, len = 2) => String(n).padStart(len, "0");
  const TEXTURES = ["dune-c", "dune-d", "dune-full", "dunes-1", "dunes-2", "dune-hero", "dune-a", "dune-e"];

  const texUrl = (i) => `/img/textures/${TEXTURES[i % TEXTURES.length]}.webp`;

  let items = [];
  let active = 0;

  /* Portrait cover: dune texture, title and the project's strongest visual. */
  function poster(p, i, lazy = true) {
    let foot;
    if (p.image) {
      foot = `<img src="${escHtml(p.image)}" alt="" ${lazy ? 'loading="lazy"' : ""} decoding="async" />`;
    } else if (p.metric) {
      foot = `<p class="poster-num" lang="en" dir="ltr">${escHtml(p.metric)}</p><p class="poster-cap">${pick(p, "metric")}</p>`;
    } else if (p.flow) {
      foot = `<ol class="poster-flow" lang="en" dir="ltr">${p.flow.map((f, k) => `<li><span>${pad(k + 1)}</span>${escHtml(f)}</li>`).join("")}</ol>`;
    } else {
      foot = `<ul class="poster-tags" lang="en" dir="ltr">${(p.tags || []).map((x) => `<li>${escHtml(x)}</li>`).join("")}</ul>`;
    }
    return `<div class="poster" style="--tex:url(${texUrl(i)})">
      <div class="poster-bg"></div>
      <div class="poster-in">
        <div class="poster-top"><span lang="en" dir="ltr">${pad(i + 1)}</span><span>${pick(p, "kind")}</span></div>
        <p class="poster-title" lang="en" dir="ltr">${escHtml(p.title)}</p>
        <div class="poster-foot">${foot}</div>
      </div>
    </div>`;
  }

  /* ---------- Diagonal gallery ----------
     Front card sits lower-left; each card behind is 88% the size and steps up-right.
     Geometry is in multiples of the front card's width (--card-w). */
  const SCALE = 0.88, STEP_X = 0.6, STEP_Y = 0.26, SKEW = 14;
  const gallery = document.getElementById("gallery");
  const stack = document.getElementById("stack");
  const panel = document.getElementById("stage-panel");
  const rail = document.getElementById("stage-rail");
  const glows = [...document.querySelectorAll(".stage-glow i")];
  let glowAt = 0;
  const visibleCount = () => (window.matchMedia("(max-width: 639px)").matches ? 6 : 9);

  function place(d) {
    if (d < 0) return { x: -1.15, y: -0.55, s: 1 };
    let x = 0, y = 0;
    for (let k = 0; k < d; k++) { x += STEP_X * SCALE ** k; y += STEP_Y * SCALE ** k; }
    return { x, y, s: SCALE ** d };
  }

  function layoutStack() {
    const vis = visibleCount();
    [...stack.children].forEach((li, i) => {
      const d = i - active;
      const shown = d >= 0 && d < vis;
      const { x, y, s } = place(d);
      li.style.transform = `translate(calc(${x} * var(--card-w)), calc(${-y} * var(--card-w))) skewY(${SKEW}deg) scale(${s})`;
      li.style.opacity = shown ? "1" : "0";
      li.style.zIndex = String(items.length - Math.abs(d));
      li.style.transitionDelay = `${Math.abs(d) * 20}ms`;
      li.classList.toggle("is-hidden", !shown);
      li.classList.toggle("is-active", d === 0);
      const a = li.firstElementChild;
      a.tabIndex = shown ? 0 : -1;
      a.toggleAttribute("aria-hidden", !shown);
      a.setAttribute("aria-label", `${d === 0 ? t("open") : t("show")}: ${items[i].title}`);
    });
    [...rail.children].forEach((b, i) => b.toggleAttribute("aria-current", i === active));
  }

  /* The active project's story beside the stack, and its colours glowing behind it. */
  function showActive(dir = 0) {
    const p = items[active];
    panel.style.setProperty("--from", `${dir * 18}px`);
    panel.classList.toggle("is-static", dir === 0);
    const metric = p.metric
      ? `<p class="panel-metric" style="--k:4"><strong lang="en" dir="ltr">${escHtml(p.metric)}</strong><span>${pick(p, "metric")}</span></p>` : "";
    panel.innerHTML = `<p class="panel-num" lang="en" dir="ltr"><span>${pad(active + 1)}</span><small>/ ${pad(items.length)}</small></p>
      <p class="meta muted" style="--k:1">${pick(p, "kind")}</p>
      <h3 class="display panel-title" style="--k:2" lang="en" dir="ltr">${escHtml(p.title)}</h3>
      <p class="panel-problem" style="--k:3">${pick(p, "problem")}</p>
      ${metric}
      <ul class="tags" style="--k:4" lang="en" dir="ltr">${(p.tags || []).map((x) => `<li>${escHtml(x)}</li>`).join("")}</ul>
      <a class="pill panel-cta" style="--k:5" href="#work/${escHtml(p.id)}">${t("open")} <span aria-hidden="true">↗</span></a>`;

    const src = p.image || texUrl(active);
    if (glows[glowAt].dataset.src === src) return;
    const next = glows[1 - glowAt];
    next.dataset.src = src;
    next.style.backgroundImage = `url("${src}")`;
    next.classList.add("on");
    glows[glowAt].classList.remove("on");
    glowAt = 1 - glowAt;
  }

  // Scrolling the (tall) gallery section moves through the projects.
  const scrollRange = () => gallery.offsetHeight - window.innerHeight;
  function syncFromScroll() {
    if (!items.length || gallery.hidden) return;
    const r = gallery.getBoundingClientRect();
    const idx = Math.round(clamp(-r.top / scrollRange()) * (items.length - 1));
    if (idx === active) return;
    const dir = idx > active ? 1 : -1;
    active = idx;
    layoutStack();
    showActive(dir);
  }
  function scrollToCard(i) {
    const top = gallery.getBoundingClientRect().top + window.scrollY + (i / (items.length - 1)) * scrollRange();
    window.scrollTo({ top: Math.round(top), behavior: reduceMotion ? "auto" : "smooth" });
  }
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; syncFromScroll(); });
  }, { passive: true });
  window.addEventListener("resize", () => { layoutStack(); syncFromScroll(); });

  stack.addEventListener("click", (e) => {
    const a = e.target.closest(".card-link");
    if (!a) return;
    const i = Number(a.dataset.i);
    if (i === active) return; // follows the #work/<id> link
    e.preventDefault();
    scrollToCard(i);
  });
  stack.addEventListener("keydown", (e) => {
    const dir = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    if (!dir) return;
    e.preventDefault();
    const i = clamp(active + dir, 0, items.length - 1);
    scrollToCard(i);
    stack.children[i]?.firstElementChild.focus({ preventScroll: true });
  });

  function renderGallery() {
    gallery.style.height = `calc(100vh + ${items.length - 1} * 20vh)`;
    stack.innerHTML = items.map((p, i) => `<li class="card">
        <a class="card-link" href="#work/${escHtml(p.id)}" data-i="${i}">
          <span class="card-lift">${poster(p, i, i > 3)}</span>
          <span class="card-label" aria-hidden="true" lang="en" dir="ltr">${pad(i + 1)} — ${escHtml(p.title)}</span>
        </a>
      </li>`).join("");
    rail.innerHTML = items.map((p, i) => `<button type="button" data-i="${i}" aria-label="${pad(i + 1)} — ${escHtml(p.title)}"></button>`).join("");
    layoutStack();
    showActive();
    syncFromScroll();
  }
  rail.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-i]");
    if (b) scrollToCard(Number(b.dataset.i));
  });

  /* ---------- List view ---------- */
  const list = document.getElementById("works-list");
  function renderList() {
    document.getElementById("rows").innerHTML = items.map((p, i) => `<li class="row reveal" style="--d:${Math.min(i, 4) * 60}ms">
        <a class="row-link" href="#work/${escHtml(p.id)}" aria-label="${t("open")}: ${escHtml(p.title)}">
          <div class="row-text">
            <p class="row-title" lang="en" dir="ltr">${escHtml(p.title)}</p>
            <p class="row-kind">${pick(p, "kind")}</p>
            <div class="row-foot meta"><span class="muted" lang="en" dir="ltr">${pad(i + 1, 3)}</span><span>${t("view")} <span aria-hidden="true">↗</span></span></div>
          </div>
          <div class="row-media">
            <div class="poster-wrap">${poster(p, i)}</div>
            ${p.image ? `<div class="shot"><img src="${escHtml(p.image)}" alt="" loading="lazy" decoding="async" /></div>` : ""}
          </div>
        </a>
      </li>`).join("");
    observeReveals(list);
  }

  /* ---------- View switch (remembered) ---------- */
  const switcher = document.getElementById("view-switch");
  let view = store.get("folio:view") === "list" ? "list" : "gallery";
  function setView(v, remember = true) {
    view = v;
    gallery.hidden = v !== "gallery";
    list.hidden = v !== "list";
    switcher.dataset.view = v;
    switcher.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === v)));
    if (remember) store.set("folio:view", v);
    if (v === "gallery") syncFromScroll();
  }
  switcher.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-view]");
    if (!b || b.dataset.view === view) return;
    setView(b.dataset.view);
    const works = document.getElementById("projects");
    if (works.getBoundingClientRect().top < 0) works.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  });
  // Only float the switch while the works section is on screen.
  new IntersectionObserver(([e]) => switcher.classList.toggle("is-shown", e.isIntersecting), { rootMargin: "-30% 0px -30% 0px" })
    .observe(document.getElementById("projects"));

  /* ---------- Project page (#work/<id>) ---------- */
  const page = document.getElementById("work-page");
  const body = document.getElementById("work-body");
  let openedHere = false;

  function figure(n, label, text, inner, extra = "") {
    return `<figure class="reveal reveal-lg ${extra}">${inner}
      <figcaption class="meta"><span>${pad(n)} / ${label}</span><span class="muted">· ${text}</span></figcaption></figure>`;
  }

  function renderWork(id) {
    const i = items.findIndex((p) => p.id === id);
    if (i < 0) return false;
    const p = items[i];
    const next = items[(i + 1) % items.length];
    const ni = (i + 1) % items.length;
    let n = 0;
    const metric = p.metric
      ? `<div><dt class="meta muted">${pick(p, "metric")}</dt><dd class="num" lang="en" dir="ltr">${escHtml(p.metric)}</dd></div>` : "";
    const linksHtml = (p.links || []).length
      ? (p.links || []).map((l) => `<a class="pill" href="${safeUrl(l.url)}" target="_blank" rel="noopener">${escHtml((lang === "en" ? l.label_en : l.label_ar) || t("link"))} <span aria-hidden="true">↗</span></a>`).join("")
      : `<p class="meta muted">${t("priv")}</p>`;

    body.innerHTML = `<div class="work-grid">
        <header class="work-info">
          <p class="meta muted" lang="en" dir="ltr">${pad(i + 1)} / ${pad(items.length)}</p>
          <h1 class="display work-title" id="work-title" lang="en" dir="ltr">${escHtml(p.title)}</h1>
          <p class="work-summary">${pick(p, "problem")}</p>
          <dl class="work-meta">
            <div><dt class="meta muted">${t("discipline")}</dt><dd>${pick(p, "kind")}</dd></div>
            <div><dt class="meta muted">${t("stack")}</dt><dd lang="en" dir="ltr">${(p.tags || []).map(escHtml).join(", ")}</dd></div>
            ${metric}
          </dl>
          <p class="work-overview">${pick(p, "solution")}</p>
          <div class="work-links">${linksHtml}</div>
        </header>
        <div class="work-media">
          ${figure(++n, t("cover"), t("poster"), `<div class="poster-wrap">${poster(p, i, false)}</div>`)}
          ${p.image ? figure(++n, t("ui"), t("screen"), `<img src="${escHtml(p.image)}" alt="${escHtml(p.title)}" />`) : ""}
          ${p.flow ? figure(++n, t("arch"), t("flow"), `<ol class="work-flow">${p.flow.map((f, k) => `<li><span class="meta muted">${pad(k + 1)}</span><p>${escHtml(f)}</p></li>`).join("")}</ol>`) : ""}
        </div>
      </div>
      <section class="next-work">
        <p class="meta muted">${t("next")}</p>
        <a class="next-link" href="#work/${escHtml(next.id)}" aria-label="${t("next")}: ${escHtml(next.title)}">
          <div class="poster-wrap">${poster(next, ni)}</div>
          <div>
            <p class="meta muted">${pick(next, "kind")}</p>
            <p class="display next-title"><span lang="en" dir="ltr">${escHtml(next.title)}</span><span class="arrow" aria-hidden="true">→</span></p>
          </div>
        </a>
      </section>`;
    page.setAttribute("aria-labelledby", "work-title");
    return true;
  }

  function openWork(id) {
    if (!renderWork(id)) return closeWork();
    page.hidden = false;
    page.scrollTop = 0;
    root.style.overflow = "hidden";
    observeReveals(page);
    body.focus({ preventScroll: true });
    // Keep the gallery on this project for when the visitor comes back.
    const i = items.findIndex((p) => p.id === id);
    if (view === "gallery" && i >= 0 && i !== active) {
      active = i;
      const top = gallery.getBoundingClientRect().top + window.scrollY + (i / (items.length - 1)) * scrollRange();
      window.scrollTo({ top: Math.round(top), behavior: "auto" });
      layoutStack();
      showActive();
    }
  }
  function closeWork() {
    if (page.hidden) return;
    page.hidden = true;
    root.style.overflow = "";
    const target = view === "gallery" ? stack.children[active]?.firstElementChild : list.querySelectorAll(".row-link")[0];
    target?.focus({ preventScroll: true });
  }
  const route = () => {
    const m = location.hash.match(/^#work\/(.+)$/);
    if (m) openWork(decodeURIComponent(m[1])); else closeWork();
  };
  window.addEventListener("hashchange", route);
  document.addEventListener("click", (e) => { if (e.target.closest('a[href^="#work/"]')) openedHere = true; });
  document.getElementById("work-back").addEventListener("click", (e) => {
    e.preventDefault();
    if (openedHere) { openedHere = false; history.back(); return; }
    history.replaceState(null, "", location.pathname + location.search);
    closeWork();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !page.hidden) document.getElementById("work-back").click();
  });

  /* ---------- Load + render ---------- */
  function renderWorks() {
    if (!items.length) return;
    document.getElementById("works-count").textContent = `[${items.length}]`;
    renderGallery();
    renderList();
    if (!page.hidden) route();
  }

  (async () => {
    try {
      const res = await fetch("data/projects.json", { cache: "no-cache" });
      if (!res.ok) return;
      items = await res.json();
      renderWorks();
      setView(view, false);
      route();
    } catch { /* keep the section empty */ }
  })();

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
  if (!reduceMotion) {
    const co = new IntersectionObserver((entries, obs) => entries.forEach((e) => {
      if (e.isIntersecting) { countUp(e.target); obs.unobserve(e.target); }
    }), { threshold: 0.6 });
    document.querySelectorAll("[data-count]").forEach((el) => co.observe(el));
  }

  if (lang === "en") applyLang("en");
  else { buildRolls(); if (langBtn) setRoll(langBtn, "EN"); if (toggle) setRoll(toggle, t("menu")); }
})();
