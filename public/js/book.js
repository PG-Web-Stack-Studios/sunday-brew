import { el } from "./lib.js";

const form = document.getElementById("booking-form");
const status = document.getElementById("form-status");
const button = form.querySelector('button[type="submit"]');
const startedAt = Date.now();

const eventType = form.elements.event_type;
const otherField = document.getElementById("event_type_other_field");
eventType.addEventListener("change", () => {
  otherField.hidden = eventType.value !== "Other";
  form.elements.event_type_other.required = !otherField.hidden;
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!form.reportValidity()) return;

  const data = new FormData(form);
  const body = Object.fromEntries(data);
  body.setup_details = data.getAll("setup_details");
  body.elapsed_ms = Date.now() - startedAt;

  button.disabled = true;
  status.replaceChildren(el("p", { class: "notice" }, "Sending…"));

  let message = "We couldn't send your request. Please try again or message us on Instagram.";
  try {
    const res = await fetch(window.SB_CONFIG.BOOKING_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (json.error) message = json.error;
      throw new Error(message);
    }

    form.reset();
    status.replaceChildren(el("p", { class: "notice notice-success" }, "Thanks! We received your request and will get back to you soon."));
  } catch {
    status.replaceChildren(el("p", { class: "notice notice-error" }, message));
  } finally {
    button.disabled = false;
  }
});
