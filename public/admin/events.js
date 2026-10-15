import { supabase, el, requireAdmin, field, checkbox, flash, azDate, azTime, fromAz } from "./admin.js";
import { formatDate, formatTime } from "../js/lib.js";

await requireAdmin();

const editor = document.getElementById("editor");
const upcoming = document.getElementById("upcoming");
const past = document.getElementById("past");

async function load() {
  const { data, error } = await supabase.from("events").select("*").order("starts_at");
  if (error) {
    upcoming.replaceChildren(el("li", { class: "notice notice-error" }, "Couldn't load events."));
    return;
  }
  const now = new Date().toISOString();
  const next = data.filter((e) => e.ends_at >= now);
  const old = data.filter((e) => e.ends_at < now).reverse();
  upcoming.replaceChildren(...(next.length ? next.map(card) : [el("li", { class: "muted" }, "No upcoming events.")]));
  past.replaceChildren(...old.map(card));
}

function card(ev) {
  return el("li", { class: "card" },
    el("h3", {}, ev.title, ev.is_published ? "" : " (hidden)"),
    el("p", { class: "card-meta" }, `${formatDate(ev.starts_at)} · ${formatTime(ev.starts_at)} – ${formatTime(ev.ends_at)}`),
    el("p", {}, [ev.address, ev.city].filter(Boolean).join(", ")),
    el("div", { class: "row" },
      el("button", { class: "button button-secondary", type: "button", onclick: () => openEditor(ev) }, "Edit"),
      el("button", { class: "button button-secondary", type: "button", onclick: () => openEditor({ ...ev, id: null, starts_at: null, ends_at: null }, ev) }, "Duplicate"),
      el("button", { class: "button button-danger", type: "button", onclick: () => remove(ev) }, "Delete"),
    ),
  );
}

function openEditor(ev = {}, source) {
  const title = el("input", { required: true, value: ev.title ?? "" });
  const address = el("input", { required: true, value: ev.address ?? "" });
  const city = el("input", { value: ev.city ?? "" });
  const date = el("input", { type: "date", required: true, value: ev.starts_at ? azDate(ev.starts_at) : "" });
  const start = el("input", { type: "time", required: true, value: ev.starts_at ? azTime(ev.starts_at) : source ? azTime(source.starts_at) : "" });
  const end = el("input", { type: "time", required: true, value: ev.ends_at ? azTime(ev.ends_at) : source ? azTime(source.ends_at) : "" });
  const notes = el("textarea", { value: ev.notes ?? "" });
  const published = checkbox("Show on the website", "is_published", ev.is_published ?? true);
  const msg = el("div", { "aria-live": "polite" });

  const form = el("form", { class: "form card" },
    el("h2", {}, ev.id ? "Edit event" : "New event"),
    field("Name", title, "e.g. Downtown Phoenix Farmers Market"),
    field("Address", address),
    field("City", city),
    el("div", { class: "row" }, field("Date", date), field("Starts", start), field("Ends", end)),
    field("Notes (optional)", notes),
    published,
    el("div", { class: "row" },
      el("button", { class: "button", type: "submit" }, "Save"),
      el("button", { class: "button button-secondary", type: "button", onclick: () => editor.replaceChildren() }, "Cancel"),
    ),
    msg,
  );

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (end.value <= start.value) return flash(msg, "The end time must be after the start time.", false);
    const row = {
      title: title.value.trim(),
      address: address.value.trim(),
      city: city.value.trim() || null,
      starts_at: fromAz(date.value, start.value),
      ends_at: fromAz(date.value, end.value),
      notes: notes.value.trim() || null,
      is_published: published.querySelector("input").checked,
    };
    const { error } = ev.id
      ? await supabase.from("events").update(row).eq("id", ev.id)
      : await supabase.from("events").insert(row);
    if (error) return flash(msg, "Couldn't save. Please try again.", false);
    editor.replaceChildren();
    load();
  });

  editor.replaceChildren(form);
  form.scrollIntoView({ behavior: "smooth" });
  title.focus();
}

async function remove(ev) {
  if (!confirm(`Delete "${ev.title}"?`)) return;
  const { error } = await supabase.from("events").delete().eq("id", ev.id);
  if (error) return alert("Couldn't delete. Please try again.");
  load();
}

document.getElementById("new-event").addEventListener("click", () => openEditor());
load();
