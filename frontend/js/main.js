(() => {
  "use strict";

  const API_URL = `${(window.APP_CONFIG?.API_BASE_URL || "").replace(/\/$/, "")}/api/ask`;
  const REQUEST_TIMEOUT_MS = 25000;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- Language + theme ---------------- */
  const STR = {
    ar: {
      title: "سارة الحربي | Sara Alharbi — Artificial Intelligence",
      menu: "القائمة", close: "إغلاق", langBtn: "EN",
      online: "متصل", typing: "يكتب…", offline: "غير متصل",
      you: "أنت", bot: "المساعد", thinking: "جارٍ الكتابة",
      noAnswer: "لم تصل إجابة.", fail: "تعذّر الحصول على إجابة الآن.",
      timeout: "انتهت مهلة الطلب. حاول مرة أخرى.",
      net: "تعذّر الاتصال بالمساعد حالياً. يمكنك التواصل مع سارة مباشرة عبر Saraalharbi0031@gmail.com",
    },
    en: {
      title: "Sara Alharbi | سارة الحربي — Artificial Intelligence",
      menu: "Menu", close: "Close", langBtn: "عربي",
      online: "Online", typing: "Typing…", offline: "Offline",
      you: "You", bot: "Assistant", thinking: "Typing",
      noAnswer: "No answer received.", fail: "Couldn't get an answer right now.",
      timeout: "The request timed out. Please try again.",
      net: "Couldn't reach the assistant right now. You can contact Sara directly at Saraalharbi0031@gmail.com",
    },
  };
  const root = document.documentElement;
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
  };
  let lang = store.get("lang") === "en" ? "en" : "ar";
  const t = (k) => STR[lang][k];

  const langBtn = document.getElementById("lang-toggle");
  const themeBtn = document.getElementById("theme-toggle");
  const statusEl = document.getElementById("chat-status");
  statusEl?.removeAttribute("data-en");
  let statusState = "online";
  const renderStatus = () => { if (statusEl) statusEl.textContent = t(statusState); };

  function applyLang(l) {
    lang = l;
    root.setAttribute("lang", l);
    root.setAttribute("dir", l === "en" ? "ltr" : "rtl");
    document.title = t("title");
    document.querySelectorAll("[data-en]").forEach((el) => {
      if (el.dataset.ar === undefined) el.dataset.ar = el.innerHTML;
      el.innerHTML = l === "en" ? el.dataset.en : el.dataset.ar;
    });
    document.querySelectorAll("[data-en-placeholder]").forEach((el) => {
      if (el.dataset.arPlaceholder === undefined) el.dataset.arPlaceholder = el.getAttribute("placeholder") || "";
      el.setAttribute("placeholder", l === "en" ? el.dataset.enPlaceholder : el.dataset.arPlaceholder);
    });
    document.querySelectorAll("img[data-alt-en]").forEach((img) => {
      if (img.dataset.altAr === undefined) img.dataset.altAr = img.getAttribute("alt") || "";
      img.setAttribute("alt", l === "en" ? img.dataset.altEn : img.dataset.altAr);
    });
    if (langBtn) langBtn.textContent = t("langBtn");
    const navToggle = document.querySelector(".nav-toggle");
    if (navToggle) navToggle.textContent = document.getElementById("site-nav")?.classList.contains("is-open") ? t("close") : t("menu");
    renderStatus();
    store.set("lang", l);
  }

  function applyTheme(th) {
    root.setAttribute("data-theme", th);
    themeBtn?.setAttribute("aria-pressed", String(th === "dark"));
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", th === "dark" ? "#1C1510" : "#D7C3AA");
    store.set("theme", th);
  }

  langBtn?.addEventListener("click", () => applyLang(lang === "ar" ? "en" : "ar"));
  themeBtn?.addEventListener("click", () =>
    applyTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark")
  );

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
    // back at the hero: nothing in the nav should stay highlighted
    window.addEventListener("scroll", () => {
      if (window.scrollY < 200) links.forEach((l) => l.classList.remove("is-active"));
    }, { passive: true });

    /* Reveal on scroll */
    if (!reduceMotion) {
      const revealables = document.querySelectorAll(
        ".section-head, .stat, .proj-card, .service-card, .edu-grid .degree, .cert-tile, .chat, .cta-inner"
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
        { rootMargin: "0px 0px -8% 0px" }
      );
      revealables.forEach((el) => {
        el.style.setProperty("--i", String([...el.parentElement.children].indexOf(el)));
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
    who.dataset.ar = role === "user" ? STR.ar.you : STR.ar.bot;
    who.dataset.en = role === "user" ? STR.en.you : STR.en.bot;
    who.textContent = t(role === "user" ? "you" : "bot");
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
    p.innerHTML = '<span class="thinking" aria-label="' + t("thinking") + '"><span></span><span></span><span></span></span>';
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
    statusState = state ? "typing" : "online";
    renderStatus();
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
        throw new Error(detail || t("fail"));
      }

      await typeOut(p, data.answer || t("noAnswer"));
    } catch (err) {
      wrap.classList.add("msg-error");
      const msg =
        err.name === "AbortError"
          ? t("timeout")
          : err instanceof TypeError
          ? t("net")
          : err.message;
      p.innerHTML = linkify(msg);
      status.classList.add("is-error");
    } finally {
      clearTimeout(timer);
      const hadError = status.classList.contains("is-error");
      setBusy(false);
      if (hadError) {
        status.classList.add("is-error");
        statusState = "offline";
        renderStatus();
      }
      input.focus({ preventScroll: true });
    }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    ask(input.value);
  });

  chips.forEach((chip) => chip.addEventListener("click", () => ask(chip.textContent)));

  /* Projects from data/projects.json (add new entries there) */
  const escHtml = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const safeUrl = (u) => (/^https?:\/\//.test(u) ? escHtml(u) : "#");

  function projectCard(p, featured) {
    const links = (p.links || []).map((l) =>
      `<a href="${safeUrl(l.url)}" target="_blank" rel="noopener" data-en="${escHtml(l.label_en || "Link")}">${escHtml(l.label_ar || "رابط")}</a>`).join("");
    const metric = p.metric
      ? `<div class="proj-metric"><span class="proj-metric-num" lang="en">${escHtml(p.metric)}</span><span data-en="${escHtml(p.metric_en)}">${escHtml(p.metric_ar)}</span></div>`
      : "";
    const problem = featured && p.problem_ar
      ? `<details class="proj-more"><summary data-en="The problem it solves">المشكلة التي يحلّها</summary><p data-en="${escHtml(p.problem_en)}">${escHtml(p.problem_ar)}</p></details>`
      : "";
    return `<article class="proj-card${featured ? " is-featured" : ""}">
      <div class="proj-top">
        <span class="project-kind" data-en="${escHtml(p.kind_en)}">${escHtml(p.kind_ar)}</span>
        ${metric}
      </div>
      <h3 class="project-title" lang="en">${escHtml(p.title)}</h3>
      <p class="proj-text" data-en="${escHtml(p.solution_en)}">${escHtml(p.solution_ar)}</p>
      ${problem}
      <ul class="tags" lang="en">${(p.tags || []).map((t) => `<li>${escHtml(t)}</li>`).join("")}</ul>
      ${links ? `<div class="project-links">${links}</div>` : ""}
    </article>`;
  }

  async function renderProjects() {
    const top = document.getElementById("featured-projects");
    const rest = document.getElementById("more-projects");
    if (!top || !rest) return;
    try {
      const res = await fetch("data/projects.json", { cache: "no-cache" });
      if (!res.ok) return;
      const items = await res.json();
      top.innerHTML = items.filter((p) => p.featured).map((p) => projectCard(p, true)).join("");
      rest.innerHTML = items.filter((p) => !p.featured).map((p) => projectCard(p, false)).join("");
      document.querySelectorAll(".proj-card").forEach((el) => {
        el.style.setProperty("--i", String([...el.parentElement.children].indexOf(el)));
      });
    } catch { /* keep empty */ }
    if (lang === "en") applyLang("en");
  }
  renderProjects();

  /* ---------------- Count-up numbers ---------------- */
  function countUp(el) {
    const target = parseFloat(el.dataset.count);
    const dec = Number(el.dataset.decimals || 0);
    const suffix = el.dataset.suffix || "";
    if (reduceMotion || !isFinite(target)) return;
    const start = performance.now();
    const dur = 1400;
    const tick = (now) => {
      const k = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - k, 3);
      el.textContent = (target * eased).toFixed(dec) + suffix;
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  if ("IntersectionObserver" in window) {
    const counter = new IntersectionObserver((entries, obs) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { countUp(e.target); obs.unobserve(e.target); }
      });
    }, { threshold: 0.6 });
    document.querySelectorAll("[data-count]").forEach((el) => counter.observe(el));
  }
  applyTheme(root.getAttribute("data-theme") === "dark" ? "dark" : "light");
  if (lang === "en") applyLang("en");
})();
