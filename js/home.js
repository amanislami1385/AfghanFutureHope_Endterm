/* Home page: a four-step preparation checklist and a calculated percentage. */
"use strict";
(() => {
  const checkboxes = [...document.querySelectorAll(".readiness-check")];
  const stored = AFH.read("readiness", []);
  const checked = Array.isArray(stored) ? stored : [];
  checkboxes.forEach((box) => {
    box.checked = checked.includes(box.value);
  });
  function updateReadiness(save = true) {
    const completed = checkboxes.filter((box) => box.checked);
    const percent = Math.round((completed.length / checkboxes.length) * 100);
    document
      .querySelector(".progress-ring")
      .style.setProperty("--progress", percent + "%");
    document
      .querySelector(".progress-ring")
      .setAttribute("aria-valuenow", percent);
    document.getElementById("readiness-percent").textContent = percent + "%";
    document.getElementById("readiness-count").textContent =
      `${completed.length} of ${checkboxes.length} steps complete`;
    document.getElementById("readiness-title").textContent =
      percent === 100
        ? "Prepared for your next step. Keep going!"
        : percent > 0
          ? "You are making progress. One step at a time."
          : "Your future starts with a first step.";
    checkboxes.forEach((box) =>
      box
        .closest(".checklist-item")
        .classList.toggle("is-complete", box.checked),
    );
    if (
      save &&
      !AFH.write(
        "readiness",
        completed.map((box) => box.value),
      )
    )
      AFH.toast(
        "Progress works for this visit. Your browser is not allowing storage.",
      );
  }
  checkboxes.forEach((box) =>
    box.addEventListener("change", () => updateReadiness()),
  );
  document.getElementById("reset-checklist").addEventListener("click", () => {
    checkboxes.forEach((box) => {
      box.checked = false;
    });
    updateReadiness();
    AFH.toast("Your checklist has been reset.");
  });
  window.addEventListener("storage", (event) => {
    if (event.key === "afh-readiness") {
      const value = AFH.read("readiness", []);
      checkboxes.forEach((box) => {
        box.checked = Array.isArray(value) && value.includes(box.value);
      });
      updateReadiness(false);
    }
  });
  updateReadiness(false);
})();
