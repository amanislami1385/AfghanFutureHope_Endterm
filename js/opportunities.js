/* DOM-rendered catalog: combined filters, sorting, details and a persistent shortlist. */
"use strict";
(() => {
  const data = AFH.opportunities;
  const grid = document.getElementById("opportunity-grid");
  const search = document.getElementById("search");
  const access = document.getElementById("access-filter");
  const sort = document.getElementById("sort");
  const savedOnly = document.getElementById("saved-only");
  const dialog = document.getElementById("opportunity-dialog");
  const el = AFH.element;
  let saved = new Set(AFH.saved());
  let category = new URLSearchParams(location.search).get("category") || "all";
  if (!data.some((item) => item.category === category)) category = "all";
  let dialogTrigger = null;

  function button(label, className, onClick) {
    const node = el("button", className, label);
    node.type = "button";
    node.addEventListener("click", onClick);
    return node;
  }
  function providerLink(item, label = "Visit official website ↗") {
    const a = el("a", "text-link", label);
    a.href = item.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.setAttribute(
      "aria-label",
      label + " for " + item.title + " (opens in a new tab)",
    );
    return a;
  }
  function toggleSaved(id) {
    if (saved.has(id)) saved.delete(id);
    else saved.add(id);
    const persisted = AFH.write("saved", [...saved]);
    AFH.toast(
      (saved.has(id)
        ? "Added to your shortlist."
        : "Removed from your shortlist.") +
        (persisted ? "" : " Saved for this visit only."),
    );
    updateShortlist();
    // Keep keyboard focus when a filter removes the card that held it.
    const focusedId = document.activeElement?.dataset.saveId;
    renderCatalog(false);
    if (focusedId) {
      const replacement = grid.querySelector(`[data-save-id="${focusedId}"]`);
      if (replacement) replacement.focus({ preventScroll: true });
      else savedOnly.focus({ preventScroll: true });
    }
    const dialogSave = dialog.querySelector("[data-dialog-save]");
    if (dialogSave) {
      dialogSave.textContent = saved.has(dialogSave.dataset.dialogSave)
        ? "Remove from shortlist"
        : "Save to shortlist";
      dialogSave.setAttribute(
        "aria-pressed",
        saved.has(dialogSave.dataset.dialogSave),
      );
    }
  }
  function showDetails(item, trigger) {
    dialogTrigger = trigger;
    const content = document.getElementById("dialog-content");
    content.replaceChildren();
    const img = el("img", "dialog-image");
    img.src = `images/learning-${item.image}.jpg`;
    img.alt = item.alt;
    img.width = 1200;
    img.height = 800;
    const badge = el("span", "opportunity-tag", item.category);
    const title = el("h2", "", item.title);
    title.id = "dialog-title";
    const meta = el(
      "p",
      "provider-name",
      item.provider + " · " + item.location,
    );
    const h3 = el("h3", "", "Make a start");
    const actions = el("div", "dialog-actions");
    const save = button(
      saved.has(item.id) ? "Remove from shortlist" : "Save to shortlist",
      "btn btn-dark-blue",
      () => toggleSaved(item.id),
    );
    save.dataset.dialogSave = item.id;
    save.setAttribute("aria-pressed", saved.has(item.id));
    actions.append(save, providerLink(item));
    content.append(
      img,
      badge,
      title,
      meta,
      el("p", "", item.details),
      h3,
      el("p", "", item.preparation),
      el(
        "p",
        "resource-note",
        `${item.accessLabel}. Suggested preparation: ${item.prepHours} hours per week. Check the provider for current requirements.`,
      ),
      actions,
    );
    dialog.showModal();
    document.getElementById("dialog-close").focus();
  }
  function createCard(item, index) {
    const article = el("article", "opportunity-card tilt-surface");
    article.dataset.tilt = "5";
    article.style.setProperty("--card-index", Math.min(index, 5));
    const photo = el("div", "opportunity-photo");
    const image = el("img");
    image.src = `images/learning-${item.image}.jpg`;
    image.alt = item.alt;
    image.loading = "lazy";
    image.width = 1200;
    image.height = 800;
    const save = button(
      saved.has(item.id) ? "♥ Saved" : "♡ Save",
      "save-button",
      () => toggleSaved(item.id),
    );
    save.dataset.saveId = item.id;
    save.setAttribute("aria-pressed", saved.has(item.id));
    save.setAttribute(
      "aria-label",
      (saved.has(item.id) ? "Remove " : "Save ") +
        item.title +
        (saved.has(item.id) ? " from shortlist" : " to shortlist"),
    );
    photo.append(image, save);
    const content = el("div", "opportunity-content");
    const title = el("h3", "", item.title);
    const meta = el("div", "resource-meta");
    meta.append(
      el("span", "", item.location),
      el("span", "", item.accessLabel),
    );
    const actions = el("div", "card-actions");
    const details = button("View details ↗", "text-button", (event) =>
      showDetails(item, event.currentTarget),
    );
    details.setAttribute("aria-label", "View details for " + item.title);
    const hours = el("span", "prep-hours", `${item.prepHours}h / week`);
    hours.title = "Suggested preparation time";
    actions.append(details, hours);
    content.append(
      el("span", "opportunity-tag", item.category),
      title,
      el("p", "provider-name", item.provider),
      el("p", "resource-description", item.description),
      meta,
      actions,
    );
    article.append(photo, content);
    return article;
  }
  function filteredItems() {
    const terms = search.value
      .toLocaleLowerCase()
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const results = data.filter((item) => {
      const haystack = [
        item.title,
        item.provider,
        item.category,
        item.description,
        item.location,
      ]
        .join(" ")
        .toLocaleLowerCase();
      return (
        terms.every((term) => haystack.includes(term)) &&
        (category === "all" || item.category === category) &&
        (access.value === "all" || item.access === access.value) &&
        (!savedOnly.checked || saved.has(item.id))
      );
    });
    if (sort.value === "title")
      results.sort((a, b) => a.title.localeCompare(b.title));
    if (sort.value === "hours")
      results.sort(
        (a, b) => a.prepHours - b.prepHours || a.title.localeCompare(b.title),
      );
    return results;
  }
  function renderCatalog(animate = true) {
    const results = filteredItems();
    $(grid).stop(true, true);
    const fragment = document.createDocumentFragment();
    results.forEach((item, index) => fragment.append(createCard(item, index)));
    AFH.motion?.forget(grid);
    grid.replaceChildren(fragment);
    AFH.motion?.enhance(grid);
    document.getElementById("result-count").textContent =
      `${results.length} of ${data.length} opportunities` +
      (savedOnly.checked ? " · saved only" : "");
    document.getElementById("empty-results").hidden = results.length > 0;
    grid.hidden = results.length === 0;
    if (results.length && animate) $(grid).hide().fadeIn(AFH.duration());
    document.querySelectorAll("[data-category]").forEach((chip) => {
      const active = chip.dataset.category === category;
      chip.classList.toggle("active", active);
      chip.setAttribute("aria-pressed", active);
    });
  }
  function updateShortlist() {
    const items = data.filter((item) => saved.has(item.id));
    const rows = document.getElementById("shortlist-rows");
    rows.replaceChildren();
    for (const [index, item] of items.entries()) {
      const row = el("tr");
      row.style.setProperty("--row-index", index);
      const name = el("th");
      name.scope = "row";
      const resource = el("div", "table-resource");
      const number = el(
        "span",
        "table-resource-number",
        String(index + 1).padStart(2, "0"),
      );
      number.setAttribute("aria-hidden", "true");
      resource.append(number, providerLink(item, item.title + " ↗"));
      name.append(resource);
      const type = el("td");
      type.append(el("span", "table-category", item.category));
      type.dataset.label = "Type";
      const hours = el("td");
      const hoursCell = el("div", "table-hours");
      const meter = el("span", "table-hours-meter");
      meter.dataset.hours = item.prepHours;
      meter.setAttribute("aria-hidden", "true");
      hoursCell.append(el("strong", "", item.prepHours + "h"), meter);
      hours.append(hoursCell);
      hours.dataset.label = "Hours / week";
      const action = el("td");
      action.dataset.label = "Action";
      const remove = button("Remove", "text-button remove-button", () => {
        toggleSaved(item.id);
        const next = rows.querySelector("button");
        (next || document.querySelector("#shortlist-empty a")).focus({
          preventScroll: true,
        });
      });
      remove.setAttribute(
        "aria-label",
        "Remove " + item.title + " from shortlist",
      );
      action.append(remove);
      row.append(name, type, hours, action);
      rows.append(row);
    }
    document.getElementById("shortlist-content").hidden = !items.length;
    document.getElementById("shortlist-empty").hidden = !!items.length;
    document.getElementById("saved-total").textContent = items.length;
    document.getElementById("hours-total").textContent =
      `Suggested preparation total: ${items.reduce((sum, item) => sum + item.prepHours, 0)} hours / week across ${items.length} saved resource${items.length === 1 ? "" : "s"}.`;
    AFH.updateSavedCounts(items.length);
    updateCapacity();
  }
  // Compare the saved-resource estimate with a visitor-controlled time budget.
  function updateCapacity() {
    const capacity = document.getElementById("capacity-hours");
    const hours = Math.max(1, Math.min(40, Number(capacity.value) || 10));
    const total = data
      .filter((item) => saved.has(item.id))
      .reduce((sum, item) => sum + item.prepHours, 0);
    const percent = Math.round((total / hours) * 100);
    document.getElementById("capacity-output").textContent = `${hours} hours`;
    capacity.style.setProperty("--range-fill", ((hours - 1) / 39) * 100 + "%");
    const ring = document.getElementById("capacity-ring");
    ring.style.setProperty("--capacity", Math.min(percent, 100) + "%");
    ring.setAttribute("aria-valuenow", Math.min(percent, 100));
    ring.setAttribute(
      "aria-valuetext",
      `${total} of ${hours} hours, ${percent}% of your weekly capacity`,
    );
    document.getElementById("capacity-percent").textContent = percent + "%";
    const over = total > hours;
    ring
      .closest(".capacity-summary")
      .classList.toggle("is-over-capacity", over);
    document.getElementById("capacity-title").textContent = over
      ? "A little more than your week can hold."
      : "A little room for your next chapter.";
    document.getElementById("capacity-note").textContent = over
      ? `${total - hours} hours above your weekly time. Choose fewer resources or adjust your pace.`
      : `${hours - total} hours remaining from your ${hours}-hour week.`;
    document.getElementById("capacity-badge").textContent = over
      ? "Adjust your shortlist"
      : total === hours
        ? "A perfect fit"
        : "Room to grow";
    document
      .querySelectorAll(".table-hours-meter")
      .forEach((meter) =>
        meter.style.setProperty(
          "--meter",
          Math.min((Number(meter.dataset.hours) / hours) * 100, 100) + "%",
        ),
      );
  }
  document
    .getElementById("capacity-hours")
    .addEventListener("input", updateCapacity);
  function resetFilters() {
    search.value = "";
    access.value = "all";
    sort.value = "recommended";
    savedOnly.checked = false;
    category = "all";
    renderCatalog();
  }
  search.addEventListener("input", () => renderCatalog());
  search.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      search.value = "";
      renderCatalog();
    }
  });
  [access, sort, savedOnly].forEach((control) =>
    control.addEventListener("change", () => renderCatalog()),
  );
  document.querySelectorAll("[data-category]").forEach((chip) =>
    chip.addEventListener("click", () => {
      category = chip.dataset.category;
      renderCatalog();
    }),
  );
  document
    .getElementById("reset-filters")
    .addEventListener("click", resetFilters);
  document.getElementById("empty-reset").addEventListener("click", () => {
    resetFilters();
    search.focus({ preventScroll: true });
  });
  document
    .getElementById("dialog-close")
    .addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (
        event.clientX < r.left ||
        event.clientX > r.right ||
        event.clientY < r.top ||
        event.clientY > r.bottom
      )
        dialog.close();
    }
  });
  dialog.addEventListener("close", () => {
    // Saving re-renders cards; recover the matching button if the old one detached.
    const label = dialogTrigger?.getAttribute("aria-label");
    const target = dialogTrigger?.isConnected
      ? dialogTrigger
      : [...grid.querySelectorAll("button")].find(
          (b) => b.getAttribute("aria-label") === label,
        );
    (target || search).focus({ preventScroll: true });
  });
  document
    .getElementById("download-shortlist")
    .addEventListener("click", () => {
      const items = data.filter((item) => saved.has(item.id));
      AFH.download(
        "AfghanFutureHope_Shortlist.txt",
        "AFGHAN FUTURE HOPE — MY SHORTLIST\n\n" +
          items
            .map(
              (item, index) =>
                `${index + 1}. ${item.title}\n${item.url}\nSuggested preparation: ${item.prepHours} hours/week\nNext step: ${item.preparation}`,
            )
            .join("\n\n") +
          "\n\nCheck official providers for current terms. Preparation hours are project planning estimates.",
      );
    });
  window.addEventListener("storage", (event) => {
    if (event.key === "afh-saved") {
      saved = new Set(AFH.saved());
      updateShortlist();
      renderCatalog(false);
    }
  });
  updateShortlist();
  renderCatalog(false);
})();
