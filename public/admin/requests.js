import { supabase, el, requireAdmin, field, numberOrNull, flash } from "./admin.js";

await requireAdmin();

const STATUSES = [
  ["new", "New"],
  ["contacted", "Contacted"],
  ["quoted", "Quoted"],
  ["pending_payment", "Pending payment"],
  ["paid", "Paid"],
  ["completed", "Completed"],
  ["cancelled", "Cancelled"],
];
const LABEL = Object.fromEntries(STATUSES);
const CLOSED = new Set(["completed", "cancelled"]);
const SERVICE = {
  custom_package: "Custom Drink Package (on-site)",
  cans_20oz: "20 oz iced lattes in cans (on-site)",
  cans_12oz_dropoff: "12 oz chilled lattes in cans (drop-off)",
  not_sure: "Not sure yet",
  other: "Other",
};
const SETUP = { indoor: "Indoor", outdoor: "Outdoor", ground_level: "Ground-level access" };

const list = document.getElementById("requests");
const filters = document.getElementById("filters");
const statusSelect = filters.elements.status;
for (const [value, label] of STATUSES) statusSelect.append(el("option", { value }, label));

let requests = [];

async function load() {
  const { data, error } = await supabase.from("booking_requests").select("*").order("created_at", { ascending: false });
  if (error) {
    list.replaceChildren(el("li", { class: "notice notice-error" }, "Couldn't load requests."));
    return;
  }
  requests = data;
  render();
}

function render() {
  document.getElementById("count-new").textContent = requests.filter((r) => r.status === "new").length;
  document.getElementById("count-pending").textContent = requests.filter((r) => r.status === "pending_payment").length;

  const { status, from, to } = Object.fromEntries(new FormData(filters));
  const shown = requests.filter((r) => {
    if (status === "open" && CLOSED.has(r.status)) return false;
    if (status && status !== "open" && r.status !== status) return false;
    if (from && (!r.event_date || r.event_date < from)) return false;
    if (to && (!r.event_date || r.event_date > to)) return false;
    return true;
  });

  if (!shown.length) {
    list.replaceChildren(el("li", { class: "muted" }, "No requests here."));
    return;
  }
  list.replaceChildren(...shown.map(card));
}

function card(r) {
  const status = el("select", { name: "status" }, STATUSES.map(([v, l]) => el("option", { value: v, selected: v === r.status }, l)));
  const quoted = el("input", { name: "quoted_amount", type: "number", step: "0.01", min: "0", value: r.quoted_amount ?? "" });
  const paid = el("input", { name: "paid_amount", type: "number", step: "0.01", min: "0", value: r.paid_amount ?? "" });
  const notes = el("textarea", { name: "internal_notes", value: r.internal_notes ?? "" });
  const msg = el("div", { "aria-live": "polite" });

  const form = el("form", { class: "form" },
    el("div", { class: "row" }, field("Status", status), field("Quoted ($)", quoted), field("Paid ($)", paid)),
    field("Internal notes", notes, "Only you two can see this."),
    el("div", { class: "row" },
      el("button", { class: "button", type: "submit" }, "Save"),
      el("button", { class: "button button-danger", type: "button", onclick: () => remove(r) }, "Delete"),
    ),
    msg,
  );
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const update = {
      status: status.value,
      quoted_amount: numberOrNull(quoted.value),
      paid_amount: numberOrNull(paid.value),
      internal_notes: notes.value.trim() || null,
    };
    const { error } = await supabase.from("booking_requests").update(update).eq("id", r.id);
    if (error) return flash(msg, "Couldn't save. Please try again.", false);
    Object.assign(r, update);
    render();
  });

  const when = [r.event_date, r.event_time].filter(Boolean).join(" · ") || "Date not set";
  return el("li", {},
    el("details", { class: "card" },
      el("summary", {},
        el("strong", {}, r.name), " — ", when, " ",
        el("span", { class: "status" }, LABEL[r.status] ?? r.status),
      ),
      el("dl", {},
        detail("Email", el("a", { href: `mailto:${r.email}` }, r.email)),
        r.phone && detail("Phone", el("a", { href: `tel:${r.phone}` }, r.phone)),
        r.event_type && detail("Event", r.event_type),
        r.location && detail("Location", r.location),
        r.guest_count != null && detail("Guests", r.guest_count),
        r.service_type && detail("Service", SERVICE[r.service_type] ?? r.service_type),
        r.setup_details?.length > 0 && detail("Setup", r.setup_details.map((k) => SETUP[k] ?? k).join(", ")),
        r.message && detail("Message", r.message),
        detail("Received", new Date(r.created_at).toLocaleString("en-US", { timeZone: "America/Phoenix" })),
      ),
      form,
    ),
  );
}

function detail(term, value) {
  return [el("dt", { class: "muted" }, term), el("dd", {}, value)];
}

async function remove(r) {
  if (!confirm(`Delete the request from ${r.name}? This can't be undone.`)) return;
  const { error } = await supabase.from("booking_requests").delete().eq("id", r.id);
  if (error) return alert("Couldn't delete. Please try again.");
  requests = requests.filter((x) => x.id !== r.id);
  render();
}

filters.addEventListener("change", render);
load();
