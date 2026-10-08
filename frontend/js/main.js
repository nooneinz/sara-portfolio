(() => {
  "use strict";

  const API_URL = `${(window.APP_CONFIG?.API_BASE_URL || "").replace(/\/$/, "")}/api/ask`;
  const REQUEST_TIMEOUT_MS = 25000;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
    toggle.textContent = open ? "إغلاق" : "القائمة";
  });
  nav?.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      nav.classList.remove("is-open");
      toggle?.setAttribute("aria-expanded", "false");
      if (toggle) toggle.textContent = "القائمة";
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
        ".section-head, .service, .project, .project-group, .degree, .cert-col, .contact-list li"
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
    who.textContent = role === "user" ? "أنت" : "المساعد";
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
    p.innerHTML = '<span class="thinking" aria-label="جارٍ الكتابة"><span></span><span></span><span></span></span>';
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
    status.textContent = state ? "يكتب…" : "متصل";
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
        throw new Error(detail || "تعذّر الحصول على إجابة الآن.");
      }

      await typeOut(p, data.answer || "لم تصل إجابة.");
    } catch (err) {
      wrap.classList.add("msg-error");
      const msg =
        err.name === "AbortError"
          ? "انتهت مهلة الطلب. حاول مرة أخرى."
          : err instanceof TypeError
          ? "تعذّر الاتصال بالمساعد حالياً. يمكنك التواصل مع سارة مباشرة عبر Saraalharbi0031@gmail.com"
          : err.message;
      p.innerHTML = linkify(msg);
      status.classList.add("is-error");
    } finally {
      clearTimeout(timer);
      const hadError = status.classList.contains("is-error");
      setBusy(false);
      if (hadError) {
        status.classList.add("is-error");
        status.textContent = "غير متصل";
      }
      input.focus({ preventScroll: true });
    }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    ask(input.value);
  });

  chips.forEach((chip) => chip.addEventListener("click", () => ask(chip.textContent)));
})();
