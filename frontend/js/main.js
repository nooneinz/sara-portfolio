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
      thinking: "جارٍ الكتابة", problem: "المشكلة التي يحلّها", repo: "المستودع", link: "رابط", sw: "التبديل إلى الإنجليزية" },
    en: { menu: "Menu", close: "Close", you: "You", bot: "Assistant", typing: "Typing…", online: "Online", offline: "Offline",
      noAnswer: "Couldn't get an answer right now.", none: "No answer received.", timeout: "The request timed out. Please try again.",
      conn: "Couldn't reach the assistant right now. You can contact Sara directly at Saraalharbi0031@gmail.com",
      thinking: "Typing", problem: "The problem it solves", repo: "Repository", link: "Link", sw: "Switch to Arabic" },
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
    document.title = l === "en" ? "Sara Alharbi — Software Engineer & AI Specialist" : arTitle;
    try { localStorage.setItem("sa-lang", l); } catch { /* storage unavailable */ }
    renderProjects();
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
        { rootMargin: "0px 0px -8% 0px" }
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

  function projectCard(p) {
    const links = (p.links || []).map((l) =>
      `<a href="${safeUrl(l.url)}" target="_blank" rel="noopener">${escHtml((lang === "en" ? l.label_en : l.label_ar) || t("link"))}</a>`).join("");
    const metric = p.metric
      ? `<p class="proj-metric"><strong lang="en" dir="ltr">${escHtml(p.metric)}</strong><span>${escHtml(lang === "en" ? p.metric_en : p.metric_ar)}</span></p>`
      : "";
    const problem = p.featured && p.problem_ar
      ? `<details class="proj-more"><summary>${t("problem")}</summary><p>${escHtml(lang === "en" ? p.problem_en : p.problem_ar)}</p></details>`
      : "";
    return `<article class="project proj-card reveal${p.featured ? " is-featured theme-dark" : ""}">
      <div class="project-meta"><span>${escHtml(lang === "en" ? p.kind_en : p.kind_ar)}</span></div>
      <h3 class="project-title" lang="en">${escHtml(p.title)}</h3>
      ${metric}
      <p class="project-desc">${escHtml(lang === "en" ? p.solution_en : p.solution_ar)}</p>
      ${problem}
      <ul class="tags" lang="en" dir="ltr">${(p.tags || []).map((t) => `<li>${escHtml(t)}</li>`).join("")}</ul>
      ${links ? `<div class="project-links">${links}</div>` : ""}
    </article>`;
  }

  async function renderProjects() {
    const grid = document.getElementById("projects-grid");
    if (!grid) return;
    try {
      const res = await fetch("data/projects.json", { cache: "no-cache" });
      if (!res.ok) return;
      const items = await res.json();
      grid.innerHTML = [...items.filter((p) => p.featured), ...items.filter((p) => !p.featured)].map(projectCard).join("");
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
