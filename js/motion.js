/* Progressive motion: decorative 3D tilt, scroll reveals, counters and button ripples.
   Forms and navigation work without these effects. Motion can be paused at any time. */
"use strict";
(() => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const toggle = document.getElementById("motion-toggle");
  const root = document.documentElement;
  const bound = new WeakSet();
  const lightingBound = new WeakSet();
  const counted = new WeakSet();
  const activeTilts = new Set();
  const activeLights = new Set();
  let manuallyPaused = AFH.read("motion-paused", false) === true;
  let scrollFrame = 0;
  const isPaused = () => manuallyPaused || reducedMotion.matches;

  // Lighting is a CSS background layer: it never covers controls or adds content.
  function resetLighting(surface) {
    surface.style.removeProperty("--beam-x");
    surface.style.removeProperty("--beam-y");
    surface.classList.remove("is-illuminated");
    activeLights.delete(surface);
  }
  function bindLighting(surface) {
    if (lightingBound.has(surface)) return;
    lightingBound.add(surface);
    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;
    surface.addEventListener("pointermove", (event) => {
      if (
        isPaused() ||
        document.hidden ||
        !finePointer.matches ||
        event.pointerType === "touch"
      )
        return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (isPaused() || document.hidden || !surface.isConnected) return;
        const box = surface.getBoundingClientRect();
        if (!box.width || !box.height) return;
        const x = Math.min(
          100,
          Math.max(0, ((pointerX - box.left) / box.width) * 100),
        );
        const y = Math.min(
          100,
          Math.max(0, ((pointerY - box.top) / box.height) * 100),
        );
        surface.style.setProperty("--beam-x", x.toFixed(2) + "%");
        surface.style.setProperty("--beam-y", y.toFixed(2) + "%");
        surface.classList.add("is-illuminated");
        activeLights.add(surface);
      });
    });
    const leave = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      resetLighting(surface);
    };
    surface.addEventListener("pointerleave", leave);
    surface.addEventListener("pointercancel", leave);
  }

  // Pause the long, decorative loops when their sections leave the viewport.
  const ambientObserver =
    "IntersectionObserver" in window
      ? new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) =>
              entry.target.classList.toggle(
                "light-sleeping",
                !entry.isIntersecting,
              ),
            );
          },
          { rootMargin: "80px" },
        )
      : null;

  function resetTilt(card) {
    card.style.setProperty("--tilt-x", "0deg");
    card.style.setProperty("--tilt-y", "0deg");
    card.style.setProperty("--shine-opacity", "0");
    card.classList.remove("is-tilting");
    activeTilts.delete(card);
  }
  function bindTilt(card) {
    if (bound.has(card)) return;
    bound.add(card);
    let frame = 0;
    let lastX = 0;
    let lastY = 0;
    card.addEventListener("pointermove", (event) => {
      if (isPaused() || !finePointer.matches || event.pointerType === "touch")
        return;
      lastX = event.clientX;
      lastY = event.clientY;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (isPaused() || !card.isConnected) return;
        const box = card.getBoundingClientRect();
        if (!box.width || !box.height) return;
        const x = Math.min(1, Math.max(0, (lastX - box.left) / box.width));
        const y = Math.min(1, Math.max(0, (lastY - box.top) / box.height));
        const depth = Number(card.dataset.tilt) || 5;
        card.style.setProperty(
          "--tilt-x",
          ((0.5 - y) * depth).toFixed(2) + "deg",
        );
        card.style.setProperty(
          "--tilt-y",
          ((x - 0.5) * depth * 1.4).toFixed(2) + "deg",
        );
        card.style.setProperty("--shine-x", (x * 100).toFixed(1) + "%");
        card.style.setProperty("--shine-y", (y * 100).toFixed(1) + "%");
        card.style.setProperty("--shine-opacity", "1");
        card.classList.add("is-tilting");
        activeTilts.add(card);
      });
    });
    const leave = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      resetTilt(card);
    };
    card.addEventListener("pointerleave", leave);
    card.addEventListener("pointercancel", leave);
  }
  function animateCount(node) {
    if (counted.has(node)) return;
    counted.add(node);
    const end = Number(node.dataset.count);
    if (!Number.isFinite(end) || isPaused()) {
      node.textContent = node.dataset.count;
      return;
    }
    let started;
    const tick = (time) => {
      if (!node.isConnected) return;
      if (isPaused()) {
        node.textContent = end;
        return;
      }
      started ??= time;
      const progress = Math.min((time - started) / 950, 1);
      node.textContent = Math.round(end * (1 - Math.pow(1 - progress, 3)));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  function reveal(node) {
    node.classList.add("is-visible");
    node.querySelectorAll("[data-count]").forEach(animateCount);
    if (node.matches("[data-count]")) animateCount(node);
  }
  const observer =
    "IntersectionObserver" in window
      ? new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                reveal(entry.target);
                observer.unobserve(entry.target);
              }
            });
          },
          { threshold: 0.07, rootMargin: "0px 0px -15px 0px" },
        )
      : null;
  const revealSelector =
    ".program-card, .opportunity-card, .impact-box, .about-image-wrapper, .path-image, .preparation-image, .section-heading-row, .cta-box, .planner-shell, .capacity-panel, .empty-shortlist";
  function enhance(container = document) {
    container.querySelectorAll(".tilt-surface").forEach(bindTilt);
    container
      .querySelectorAll(
        ".hero-section, .page-hero, .finder-panel, .capacity-panel, .planner-main, .cta-box",
      )
      .forEach(bindLighting);
    container.querySelectorAll(revealSelector).forEach((node, index) => {
      if (node.classList.contains("motion-reveal")) return;
      node.classList.add("motion-reveal");
      node.style.setProperty(
        "--reveal-delay",
        Math.min(index % 4, 3) * 65 + "ms",
      );
      if (!observer || isPaused()) reveal(node);
      else observer.observe(node);
    });
  }
  function forget(container) {
    container
      .querySelectorAll(".motion-reveal")
      .forEach((node) => observer?.unobserve(node));
    container.querySelectorAll(".tilt-surface").forEach(resetTilt);
  }
  function applySettings() {
    const paused = isPaused();
    root.classList.toggle("motion-paused", paused);
    toggle.setAttribute("aria-pressed", String(paused));
    toggle.disabled = reducedMotion.matches;
    toggle.querySelector(".motion-toggle-text").textContent =
      reducedMotion.matches
        ? "Reduced motion enabled"
        : paused
          ? "Enable animations"
          : "Pause animations";
    toggle.querySelector(".motion-toggle-icon").textContent = paused
      ? "▷"
      : "Ⅱ";
    if (paused) {
      activeTilts.forEach(resetTilt);
      activeLights.forEach(resetLighting);
      document.querySelectorAll(".motion-reveal").forEach(reveal);
      document
        .querySelectorAll(".button-ripple")
        .forEach((node) => node.remove());
    }
  }
  toggle.addEventListener("click", () => {
    manuallyPaused = !manuallyPaused;
    AFH.write("motion-paused", manuallyPaused);
    applySettings();
  });
  reducedMotion.addEventListener("change", applySettings);
  window.addEventListener("storage", (event) => {
    if (event.key === "afh-motion-paused") {
      manuallyPaused = AFH.read("motion-paused", false) === true;
      applySettings();
    }
  });
  document.addEventListener("click", (event) => {
    const button = event.target.closest(
      ".btn, .filter-chip, .planner-step, .hour-presets button, .hours-stepper button",
    );
    if (!button || button.disabled || isPaused()) return;
    button.querySelectorAll(".button-ripple").forEach((node) => node.remove());
    const rect = button.getBoundingClientRect();
    const ripple = document.createElement("span");
    ripple.className = "button-ripple";
    ripple.setAttribute("aria-hidden", "true");
    const size = Math.max(rect.width, rect.height) * 2;
    ripple.style.width = ripple.style.height = size + "px";
    ripple.style.left =
      (event.detail ? event.clientX - rect.left : rect.width / 2) + "px";
    ripple.style.top =
      (event.detail ? event.clientY - rect.top : rect.height / 2) + "px";
    button.append(ripple);
    ripple.addEventListener("animationend", () => ripple.remove(), {
      once: true,
    });
    setTimeout(() => ripple.remove(), 750);
  });
  function updateScroll() {
    scrollFrame = 0;
    const height = document.documentElement.scrollHeight - window.innerHeight;
    const fraction =
      height > 0 ? Math.min(1, Math.max(0, window.scrollY / height)) : 0;
    document.querySelector(".reading-progress").style.transform =
      `scaleX(${fraction})`;
  }
  window.addEventListener(
    "scroll",
    () => {
      if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll);
    },
    { passive: true },
  );
  window.addEventListener("resize", () => {
    activeTilts.forEach(resetTilt);
    activeLights.forEach(resetLighting);
    updateScroll();
  });
  function syncVisibility() {
    root.classList.toggle("motion-idle", document.hidden);
    if (document.hidden) {
      activeTilts.forEach(resetTilt);
      activeLights.forEach(resetLighting);
    }
  }
  document.addEventListener("visibilitychange", syncVisibility);
  document
    .querySelectorAll(
      ".hero-section, .page-hero, .table-section, .planner-shell, .programs-section, .explorer-section, .impact-section, .cta-box",
    )
    .forEach((surface) => ambientObserver?.observe(surface));
  AFH.motion = { enhance, forget, isPaused };
  applySettings();
  enhance();
  updateScroll();
  syncVisibility();
})();
