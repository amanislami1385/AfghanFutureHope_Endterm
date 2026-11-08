/* Bootstrap-styled form with field-level JavaScript validation and a useful local result. */
"use strict";
(() => {
  const form = document.getElementById("plan-form");
  const fields = [...form.querySelectorAll("input, select, textarea")];
  const touched = new Set();
  const field = (id) => document.getElementById(id);
  let submitted = false;
  let planText = "";
  let planCreated = false;
  const localDate = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  function dateLimits() {
    const now = new Date();
    const nextYear = new Date(now);
    nextYear.setFullYear(now.getFullYear() + 1);
    return { min: localDate(now), max: localDate(nextYear) };
  }
  function refreshDateLimits() {
    const limits = dateLimits();
    field("start-date").min = limits.min;
    field("start-date").max = limits.max;
  }
  refreshDateLimits();
  // Required values plus name, email, international phone, date, integer and goal-length rules.
  function errorFor(input) {
    const value = input.value.trim();
    if (input.type === "checkbox")
      return input.checked
        ? ""
        : "Please confirm that you understand how the planner works.";
    if (!value)
      return input.tagName === "SELECT"
        ? "Please choose an option."
        : "Please complete this field.";
    switch (input.id) {
      case "name":
        return value.length >= 2 &&
          value.length <= 80 &&
          /\p{L}/u.test(value) &&
          !/[<>\d]/u.test(value)
          ? ""
          : "Enter a name of 2–80 characters, using letters rather than numbers or angle brackets.";
      case "email":
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) &&
          value.length <= 120
          ? ""
          : "Enter a valid email address, such as name@example.com.";
      case "phone": {
        const digits = value.replace(/\D/g, "");
        return /^\+[1-9][\d ()-]*$/.test(value) &&
          digits.length >= 8 &&
          digits.length <= 15
          ? ""
          : "Start with + and a country code, then use 8–15 digits in total.";
      }
      case "interest":
        return [
          "Scholarships",
          "Digital skills",
          "Learning",
          "Languages",
        ].includes(value)
          ? ""
          : "Choose one of the listed interests.";
      case "level":
        return [
          "Secondary school",
          "Undergraduate",
          "Graduate",
          "Independent learner",
        ].includes(value)
          ? ""
          : "Choose one of the listed education levels.";
      case "start-date": {
        const { min, max } = dateLimits();
        const parsed = new Date(value + "T12:00:00");
        return /^\d{4}-\d{2}-\d{2}$/.test(value) &&
          !Number.isNaN(parsed.getTime()) &&
          localDate(parsed) === value &&
          value >= min &&
          value <= max
          ? ""
          : "Choose today or a valid date within the next year.";
      }
      case "weekly-hours":
        return Number.isInteger(Number(value)) &&
          Number(value) >= 1 &&
          Number(value) <= 40
          ? ""
          : "Enter a whole number between 1 and 40.";
      case "message":
        return value.length >= 20 && value.length <= 500
          ? ""
          : "Describe your goal in 20–500 characters.";
      default:
        return "";
    }
  }
  function validate(input) {
    const error = errorFor(input);
    const feedback = field(input.id + "-error");
    input.classList.toggle("is-invalid", !!error);
    feedback.textContent = error;
    feedback.classList.toggle("is-visible", !!error);
    input.classList.toggle("is-valid", !error);
    if (error) input.setAttribute("aria-invalid", "true");
    else input.removeAttribute("aria-invalid");
    return !error;
  }
  fields.forEach((input) => {
    input.addEventListener("blur", () => {
      if (!form.hidden) {
        touched.add(input.id);
        validate(input);
        updatePreview();
      }
    });
    const update = () => {
      if (input.id === "message")
        field("goal-count").textContent = input.value.length;
      if (submitted || touched.has(input.id)) validate(input);
      updatePreview();
      if (submitted && fields.every((item) => !errorFor(item)))
        field("form-status").textContent =
          "All fields look good. Your plan is ready to create.";
      else if (submitted)
        field("form-status").textContent =
          "Please correct the highlighted fields.";
    };
    input.addEventListener("input", update);
    input.addEventListener("change", update);
  });
  function clearValidation() {
    submitted = false;
    touched.clear();
    fields.forEach((input) => {
      input.classList.remove("is-invalid", "is-valid");
      field(input.id + "-error").classList.remove("is-visible");
      input.removeAttribute("aria-invalid");
      field(input.id + "-error").textContent = "";
    });
    field("goal-count").textContent = "0";
    field("form-status").textContent = "";
  }

  // Every input updates the optional preview; untouched fields never show errors.
  function updatePreview() {
    const ready = planCreated
      ? fields.length
      : fields.filter((input) => !errorFor(input)).length;
    field("form-progress").setAttribute("aria-valuenow", ready);
    field("form-progress").style.setProperty(
      "--completion",
      (ready / fields.length) * 100 + "%",
    );
    field("form-progress-count").textContent =
      `${ready} of ${fields.length} ready`;
    field("form-progress-label").textContent = planCreated
      ? "Your next chapter is ready"
      : ready === fields.length
        ? "All set. Make it yours."
        : "Let’s build your starting plan";
    if (!planCreated) {
      const name = field("name")
        .value.trim()
        .split(/\s+/)
        .slice(0, 2)
        .join(" ");
      field("preview-name").textContent = name
        ? `${name}’s next chapter.`
        : "A plan made for you.";
      field("preview-interest").textContent =
        field("interest").value || "Choose your direction";
      const validHours = !errorFor(field("weekly-hours"));
      const hours = validHours ? Number(field("weekly-hours").value) : 0;
      field("preview-total").textContent = hours * 4;
      field("preview-weekly").textContent = hours
        ? `${hours} hours / week`
        : "Set your weekly pace";
      document
        .querySelector(".plan-preview")
        .style.setProperty("--hours-ratio", Math.min(hours / 10, 1));
      document.querySelectorAll("[data-hours]").forEach((button) => {
        button.setAttribute(
          "aria-pressed",
          String(validHours && Number(button.dataset.hours) === hours),
        );
      });
    }
    document.querySelectorAll(".planner-step").forEach((button) => {
      const section = field(button.dataset.stepTarget);
      const group = [...section.querySelectorAll("input, select, textarea")];
      const complete = planCreated || group.every((input) => !errorFor(input));
      button.classList.toggle("is-complete", complete);
      button.disabled = planCreated;
    });
  }
  function setHours(value) {
    const hours = field("weekly-hours");
    hours.value = Math.max(1, Math.min(40, value));
    touched.add(hours.id);
    hours.dispatchEvent(new Event("input", { bubbles: true }));
    validate(hours);
  }
  document.querySelectorAll("[data-hours]").forEach((button) => {
    button.addEventListener("click", () =>
      setHours(Number(button.dataset.hours)),
    );
  });
  document.querySelectorAll("[data-hours-delta]").forEach((button) => {
    button.addEventListener("click", () => {
      const current = Number(field("weekly-hours").value);
      const base = Number.isFinite(current) ? Math.round(current) : 0;
      setHours(base + Number(button.dataset.hoursDelta));
    });
  });
  document.querySelectorAll(".planner-step").forEach((button) => {
    button.addEventListener("click", () => {
      const section = field(button.dataset.stepTarget);
      const input = section.querySelector("input, select, textarea");
      const top = Math.max(
        0,
        section.getBoundingClientRect().top + window.scrollY - 110,
      );
      $("html, body").stop(true).animate({ scrollTop: top }, AFH.duration());
      input.focus({ preventScroll: true });
    });
  });
  form.addEventListener("focusin", (event) => {
    const group = event.target.closest("fieldset");
    if (group)
      document
        .querySelectorAll(".planner-step")
        .forEach((button) =>
          button.classList.toggle(
            "is-active",
            button.dataset.stepTarget === group.id,
          ),
        );
  });
  updatePreview();
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    refreshDateLimits();
    submitted = true;
    const results = fields.map(validate);
    if (results.includes(false)) {
      field("form-status").textContent =
        "Please correct the highlighted fields.";
      fields.find((input) => input.classList.contains("is-invalid")).focus();
      return;
    }
    const name = field("name").value.trim();
    const interest = field("interest").value;
    const hours = Number(field("weekly-hours").value);
    const email = field("email").value.trim();
    const phone = field("phone").value.trim();
    const start = field("start-date").value;
    const goal = field("message").value.trim();
    const level = field("level").value;
    const total = hours * 4;
    const resources = AFH.opportunities.filter(
      (item) => item.category === interest,
    );
    const steps = [
      `Week 1 — Explore: choose one ${interest.toLowerCase()} resource and review its requirements.`,
      `Week 2 — Prepare: ${resources[0].preparation}`,
      "Week 3 — Practise: complete a learning activity or improve an application document.",
      "Week 4 — Reflect: review your progress and decide your next step.",
    ];
    field("plan-summary").textContent =
      `${name}, your ${interest.toLowerCase()} plan starts on ${start}. At ${hours} hour${hours === 1 ? "" : "s"} a week, that gives you ${total} hours over four weeks. Goal: ${goal}`;
    const list = field("plan-steps");
    list.replaceChildren();
    steps.forEach((step) => list.append(AFH.element("li", "", step)));
    const links = field("plan-links");
    links.replaceChildren();
    links.append(AFH.element("h4", "", "Resources for your next step"));
    resources.slice(0, 3).forEach((item) => {
      const a = AFH.element("a", "plan-resource", item.title + " ↗");
      a.href = item.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.setAttribute("aria-label", item.title + " (opens in a new tab)");
      links.append(a);
    });
    planText = `AFGHAN FUTURE HOPE — MY FOUR-WEEK PLAN\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone}\nEducation: ${level}\nInterest: ${interest}\nStart: ${start}\nTime: ${hours} hours/week — ${total} hours total\nGoal: ${goal}\n\n${steps.join("\n\n")}\n\nRESOURCES\n${resources.map((item) => `${item.title}: ${item.url}`).join("\n")}\n\nPersonal study plan only. No application or contact details have been sent to a provider.`;
    updatePreview();
    planCreated = true;
    form.reset();
    clearValidation();
    updatePreview();
    form.hidden = true;
    $("#plan-success")
      .stop(true, true)
      .prop("hidden", false)
      .hide()
      .fadeIn(AFH.duration(), () => field("plan-success").focus());
    AFH.toast("Your personal plan is ready. The form has been cleared.");
  });
  field("download-plan").addEventListener("click", () =>
    AFH.download("AfghanFutureHope_MyPlan.txt", planText),
  );
  field("new-plan").addEventListener("click", () => {
    $("#plan-success").stop(true, true).hide().prop("hidden", true);
    form.hidden = false;
    planText = "";
    planCreated = false;
    clearValidation();
    refreshDateLimits();
    updatePreview();
    field("name").focus();
  });
})();
