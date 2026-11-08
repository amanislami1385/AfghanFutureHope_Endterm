/* Shared navigation, resilient local storage, and three distinct jQuery effects. */
"use strict";
(() => {
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  AFH.duration = () =>
    motionQuery.matches ||
    document.documentElement.classList.contains("motion-paused")
      ? 0
      : 240;
  AFH.read = (key, fallback) => {
    try {
      return JSON.parse(localStorage.getItem("afh-" + key)) ?? fallback;
    } catch {
      return fallback;
    }
  };
  AFH.write = (key, value) => {
    try {
      localStorage.setItem("afh-" + key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  };
  AFH.saved = () => {
    const value = AFH.read("saved", []);
    return Array.isArray(value)
      ? [...new Set(value)].filter((id) =>
          AFH.opportunities.some((item) => item.id === id),
        )
      : [];
  };
  let toastTimer;
  AFH.toast = (message) => {
    const toast = $("#site-toast");
    clearTimeout(toastTimer);
    toast
      .stop(true, true)
      .text(message)
      .prop("hidden", false)
      .hide()
      .fadeIn(AFH.duration());
    toastTimer = setTimeout(
      () =>
        toast
          .stop(true, true)
          .fadeOut(AFH.duration(), () => toast.prop("hidden", true)),
      3800,
    );
  };
  AFH.updateSavedCounts = (count) =>
    document.querySelectorAll(".saved-count").forEach((el) => {
      el.textContent = count;
    });
  AFH.updateSavedCounts(AFH.saved().length);
  AFH.download = (filename, content) => {
    const url = URL.createObjectURL(
      new Blob([content], { type: "text/plain;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  AFH.element = (tag, className, content) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  };
  // Effect 1: queued animations are cleared before each accordion transition.
  $(".accordion-button, .credits-toggle").on("click", function () {
    const expanded = this.getAttribute("aria-expanded") === "true";
    const panel = $("#" + this.getAttribute("aria-controls"));
    panel.stop(true, true);
    this.setAttribute("aria-expanded", String(!expanded));
    this.classList.toggle("collapsed", expanded);
    if (expanded)
      panel.slideUp(AFH.duration(), () => panel.prop("hidden", true));
    else panel.prop("hidden", false).hide().slideDown(AFH.duration());
  });
  // Effect 2: smooth scrolling also transfers keyboard focus to the target.
  document.querySelectorAll('a[href*="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const destination = new URL(link.href, location.href);
      if (
        destination.origin !== location.origin ||
        destination.pathname !== location.pathname ||
        !destination.hash
      )
        return;
      const target = document.getElementById(
        decodeURIComponent(destination.hash.slice(1)),
      );
      if (!target) return;
      event.preventDefault();
      const mobileNav = document.getElementById("mainNavbar");
      if (mobileNav.classList.contains("show"))
        bootstrap.Collapse.getOrCreateInstance(mobileNav).hide();
      const top = Math.max(
        0,
        target.getBoundingClientRect().top + window.scrollY - 100,
      );
      $("html, body")
        .stop(true)
        .animate({ scrollTop: top }, AFH.duration() ? 360 : 0);
      if (!target.hasAttribute("tabindex"))
        target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
      try {
        history.replaceState(null, "", destination.hash);
      } catch {
        /* file:// still works */
      }
    });
  });
  // Effect 3: status messages use fadeIn/fadeOut (AFH.toast and the plan result).
  const topButton = document.getElementById("back-to-top");
  const updateScroll = () => {
    topButton.hidden = window.scrollY < 650;
    document
      .querySelector(".custom-navbar")
      .classList.toggle("is-scrolled", window.scrollY > 20);
  };
  window.addEventListener("scroll", updateScroll, { passive: true });
  updateScroll();
  topButton.addEventListener("click", () => {
    $("html, body").stop(true).animate({ scrollTop: 0 }, AFH.duration());
    document.querySelector(".navbar-brand").focus({ preventScroll: true });
  });
  document.getElementById("mainNavbar").addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      event.currentTarget.classList.contains("show")
    ) {
      bootstrap.Collapse.getOrCreateInstance(event.currentTarget).hide();
      document.querySelector(".navbar-toggler").focus();
    }
  });
})();
