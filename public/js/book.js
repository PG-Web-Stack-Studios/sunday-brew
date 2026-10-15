import { el } from "./lib.js";
import { COUNTRY_CODES } from "./country-codes.js";

const form = document.getElementById("booking-form");
const status = document.getElementById("form-status");
const button = form.querySelector('button[type="submit"]');
const startedAt = Date.now();

// Selector de código de país: EE. UU. y México primero, luego todos en orden alfabético.
const countrySelect = form.elements.phone_country;
const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
const flag = (iso) => String.fromCodePoint(...[...iso].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
const countryOption = (iso) => el("option", { value: COUNTRY_CODES[iso] }, `${flag(iso)} ${COUNTRY_CODES[iso]} ${regionNames.of(iso)}`);
const others = Object.keys(COUNTRY_CODES)
  .filter((iso) => iso !== "US" && iso !== "MX")
  .sort((a, b) => regionNames.of(a).localeCompare(regionNames.of(b)));
countrySelect.replaceChildren(
  countryOption("US"),
  countryOption("MX"),
  el("option", { disabled: true }, "──────────"),
  ...others.map(countryOption),
);
countrySelect.selectedIndex = 0;
const countryLabel = document.getElementById("phone_country_label");
const syncCountryLabel = () => {
  const text = countrySelect.selectedOptions[0]?.textContent ?? "";
  countryLabel.textContent = text.split(" ").slice(0, 2).join(" "); // "🇺🇸 +1"
};
countrySelect.addEventListener("change", syncCountryLabel);
form.addEventListener("reset", () => setTimeout(syncCountryLabel));

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
