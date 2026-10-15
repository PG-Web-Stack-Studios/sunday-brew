import { supabase, el, formatDate, formatTime, mapsUrl, showError } from "./lib.js";

const list = document.getElementById("events");

const { data, error } = await supabase
  .from("events")
  .select("id, title, address, city, starts_at, ends_at, notes")
  .eq("is_published", true)
  .gte("ends_at", new Date().toISOString())
  .order("starts_at");

if (error) {
  showError(list);
} else if (!data.length) {
  list.replaceChildren(el("li", { class: "muted" }, "No upcoming events right now — check our Instagram for updates."));
} else {
  list.replaceChildren(
    ...data.map((ev) =>
      el("li", { class: "card" },
        el("h3", {}, ev.title),
        el("p", { class: "card-meta" }, `${formatDate(ev.starts_at)} · ${formatTime(ev.starts_at)} – ${formatTime(ev.ends_at)}`),
        el("p", {}, [ev.address, ev.city].filter(Boolean).join(", ")),
        ev.notes && el("p", { class: "muted" }, ev.notes),
        el("p", {}, el("a", { href: mapsUrl(ev.address, ev.city), target: "_blank", rel: "noopener" }, "Open in Google Maps")),
      ),
    ),
  );
}
