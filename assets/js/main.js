/* ============================================================
   main.js — навигация, табы, плавный скролл (Lenis),
   reveal-анимации и параллакс (GSAP ScrollTrigger)
   ============================================================ */
(function () {
  "use strict";

  const prefersReduced = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  const data = window.SITE_DATA || {};

  /* ---------- Шапка: фон при скролле ---------- */
  const header = document.getElementById("siteHeader");
  const onScrollHeader = () => {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 40);
  };
  onScrollHeader();
  window.addEventListener("scroll", onScrollHeader, { passive: true });

  /* ---------- Мобильное меню ---------- */
  const nav = document.querySelector(".nav");
  const toggle = document.getElementById("navToggle");
  const menu = document.getElementById("navMenu");

  const closeMenu = () => {
    if (!nav) return;
    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  };

  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    menu.addEventListener("click", (e) => {
      if (e.target.tagName === "A") closeMenu();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMenu();
    });
  }

  /* ---------- Табы «Повседневная жизнь» ---------- */
  function buildTabs() {
    const root = document.getElementById("dailyTabs");
    if (!root || !data.DAILY_LIFE || !data.RELIGIONS) return;

    const list = root.querySelector(".tabs__list");
    const panels = root.querySelector(".tabs__panels");
    const themes = Object.entries(data.DAILY_LIFE); // [key, {title, lead, items}]

    themes.forEach(([key, theme], i) => {
      const tab = document.createElement("button");
      tab.className = "tab";
      tab.id = "tab-" + key;
      tab.type = "button";
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-controls", "panel-" + key);
      tab.setAttribute("aria-selected", String(i === 0));
      tab.tabIndex = i === 0 ? 0 : -1;
      tab.textContent = theme.title;
      list.appendChild(tab);

      const panel = document.createElement("div");
      panel.className = "tab-panel" + (i === 0 ? " is-active" : "");
      panel.id = "panel-" + key;
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", "tab-" + key);
      if (i !== 0) panel.hidden = true;

      const cards = data.RELIGIONS.map((r) => {
        const text = theme.items[r.id] || "";
        return (
          '<article class="faith-card">' +
          '<div class="faith-card__head">' +
          '<span class="faith-card__icon" aria-hidden="true">' +
          r.icon +
          "</span>" +
          '<span class="faith-card__name">' +
          r.name +
          "</span>" +
          "</div>" +
          "<p>" +
          text +
          "</p>" +
          "</article>"
        );
      }).join("");

      panel.innerHTML =
        '<p class="tab-panel__lead">' +
        theme.lead +
        "</p>" +
        '<div class="faith-grid">' +
        cards +
        "</div>";
      panels.appendChild(panel);
    });

    const tabs = Array.from(list.querySelectorAll(".tab"));

    function activate(index) {
      tabs.forEach((t, i) => {
        const selected = i === index;
        t.setAttribute("aria-selected", String(selected));
        t.tabIndex = selected ? 0 : -1;
        const panel = document.getElementById(
          t.getAttribute("aria-controls")
        );
        panel.classList.toggle("is-active", selected);
        panel.hidden = !selected;
      });
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    }

    list.addEventListener("click", (e) => {
      const tab = e.target.closest(".tab");
      if (tab) activate(tabs.indexOf(tab));
    });

    // Навигация стрелками по табам (a11y)
    list.addEventListener("keydown", (e) => {
      const current = tabs.indexOf(document.activeElement);
      if (current === -1) return;
      let next = null;
      if (e.key === "ArrowRight") next = (current + 1) % tabs.length;
      if (e.key === "ArrowLeft")
        next = (current - 1 + tabs.length) % tabs.length;
      if (e.key === "Home") next = 0;
      if (e.key === "End") next = tabs.length - 1;
      if (next !== null) {
        e.preventDefault();
        tabs[next].focus();
        activate(next);
      }
    });
  }

  /* ---------- Плавный скролл (Lenis) + якоря ---------- */
  let lenis = null;
  function initLenis() {
    if (prefersReduced || typeof window.Lenis === "undefined") return;
    lenis = new window.Lenis({ duration: 1.1, smoothWheel: true });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    if (window.ScrollTrigger) {
      lenis.on("scroll", window.ScrollTrigger.update);
    }
  }

  function initAnchors() {
    document.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener("click", (e) => {
        const id = link.getAttribute("href");
        if (id === "#" || id.length < 2) return;
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        if (lenis) lenis.scrollTo(target, { offset: -64 });
        else target.scrollIntoView({ behavior: "smooth" });
      });
    });
  }

  /* ---------- Анимации (GSAP ScrollTrigger) ---------- */
  function initAnimations() {
    const reveals = document.querySelectorAll("[data-reveal]");

    if (prefersReduced || typeof window.gsap === "undefined") {
      reveals.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const gsap = window.gsap;
    gsap.registerPlugin(window.ScrollTrigger);

    reveals.forEach((el) => {
      window.ScrollTrigger.create({
        trigger: el,
        start: "top 85%",
        once: true,
        onEnter: () => el.classList.add("is-visible"),
      });
    });

    // Лёгкий параллакс фоновых слоёв
    document.querySelectorAll("[data-parallax]").forEach((el) => {
      const speed = parseFloat(el.getAttribute("data-parallax")) || 0.2;
      gsap.to(el, {
        yPercent: speed * 100,
        ease: "none",
        scrollTrigger: {
          trigger: el.closest("section") || el,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    });
  }

  /* ---------- Запуск ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    buildTabs();
    initLenis();
    initAnchors();
    initAnimations();
  });
})();
