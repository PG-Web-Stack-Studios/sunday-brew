import { supabase, el, requireAdmin, field, checkbox, flash, numberOrNull, imageField } from "./admin.js";
import { formatPrice } from "../js/lib.js";

await requireAdmin();

const editor = document.getElementById("editor");
const list = document.getElementById("merch");

async function load() {
  const { data, error } = await supabase.from("merch").select("*").order("sort_order");
  if (error) {
    list.replaceChildren(el("li", { class: "notice notice-error" }, "Couldn't load merch."));
    return;
  }
  list.replaceChildren(...(data.length ? data.map(card) : [el("li", { class: "muted" }, "No items yet.")]));
}

function card(m) {
  return el("li", { class: "card" },
    m.image_url && el("img", { class: "card-image", src: m.image_url, alt: "" }),
    el("h3", {}, m.name, m.is_active ? "" : " (hidden)"),
    m.price != null && el("p", { class: "card-meta" }, formatPrice(m.price)),
    el("div", { class: "row" },
      el("button", { class: "button button-secondary", type: "button", onclick: () => openEditor(m) }, "Edit"),
      el("button", { class: "button button-danger", type: "button", onclick: () => remove(m) }, "Delete"),
    ),
  );
}

function openEditor(m = {}) {
  const name = el("input", { required: true, value: m.name ?? "" });
  const description = el("textarea", { value: m.description ?? "" });
  const price = el("input", { type: "number", step: "0.01", min: "0", value: m.price ?? "" });
  const order = el("input", { type: "number", value: m.sort_order ?? 0 });
  const active = checkbox("Show on the website", "is_active", m.is_active ?? true);
  const image = imageField(m.image_url);
  const msg = el("div", { "aria-live": "polite" });

  const form = el("form", { class: "form card" },
    el("h2", {}, m.id ? "Edit item" : "New item"),
    field("Name", name),
    field("Description (optional)", description),
    field("Price (optional)", price),
    image.node,
    field("Order", order, "Lower numbers show first."),
    active,
    el("div", { class: "row" },
      el("button", { class: "button", type: "submit" }, "Save"),
      el("button", { class: "button button-secondary", type: "button", onclick: () => editor.replaceChildren() }, "Cancel"),
    ),
    msg,
  );

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      const row = {
        name: name.value.trim(),
        description: description.value.trim() || null,
        price: numberOrNull(price.value),
        sort_order: Number(order.value) || 0,
        is_active: active.querySelector("input").checked,
        image_url: await image.resolve("merch"),
      };
      const { error } = m.id
        ? await supabase.from("merch").update(row).eq("id", m.id)
        : await supabase.from("merch").insert(row);
      if (error) throw error;
      editor.replaceChildren();
      load();
    } catch {
      flash(msg, "Couldn't save. Please try again.", false);
    } finally {
      button.disabled = false;
    }
  });

  editor.replaceChildren(form);
  form.scrollIntoView({ behavior: "smooth" });
  name.focus();
}

async function remove(m) {
  if (!confirm(`Delete "${m.name}"?`)) return;
  const { error } = await supabase.from("merch").delete().eq("id", m.id);
  if (error) return alert("Couldn't delete. Please try again.");
  load();
}

document.getElementById("new-merch").addEventListener("click", () => openEditor());
load();
