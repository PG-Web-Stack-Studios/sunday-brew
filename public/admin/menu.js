import { supabase, el, requireAdmin, field, checkbox, flash, numberOrNull, imageField } from "./admin.js";
import { formatPrice } from "../js/lib.js";

await requireAdmin();

const SIZE_PRESETS = ["12 oz cold can", "20 oz can over ice", "16 oz cup"];

const editor = document.getElementById("editor");
const container = document.getElementById("items");
const tabs = document.querySelectorAll("[data-menu]");
let currentMenu = "onsite";
let items = [];

async function load() {
  const { data, error } = await supabase
    .from("menu_items")
    .select("*, menu_item_sizes(id, label, price, sort_order)")
    .order("category")
    .order("sort_order");
  if (error) {
    container.replaceChildren(el("p", { class: "notice notice-error" }, "Couldn't load the menu."));
    return;
  }
  items = data;
  render();
}

function render() {
  tabs.forEach((t) => t.classList.toggle("button-secondary", t.dataset.menu !== currentMenu));
  const list = items.filter((i) => i.menu === currentMenu);
  if (!list.length) {
    container.replaceChildren(el("p", { class: "muted" }, "No products yet."));
    return;
  }
  const byCategory = new Map();
  for (const item of list) {
    if (!byCategory.has(item.category)) byCategory.set(item.category, []);
    byCategory.get(item.category).push(item);
  }
  container.replaceChildren(
    ...[...byCategory].map(([category, group]) =>
      el("section", { class: "menu-category" },
        el("h2", {}, category),
        el("ul", { class: "card-list" }, group.map(card)),
      ),
    ),
  );
}

function card(item) {
  const sizes = sortSizes(item.menu_item_sizes);
  const toggle = el("input", { type: "checkbox", checked: item.is_active });
  toggle.style.width = "auto";
  toggle.addEventListener("change", async () => {
    const { error } = await supabase.from("menu_items").update({ is_active: toggle.checked }).eq("id", item.id);
    if (error) {
      toggle.checked = !toggle.checked;
      return alert("Couldn't save. Please try again.");
    }
    item.is_active = toggle.checked;
  });
  return el("li", { class: "card" },
    el("h3", {}, item.name),
    item.description && el("p", { class: "card-meta" }, item.description),
    sizes.length > 0 && el("ul", { class: "sizes" }, sizes.map((s) => el("li", {}, s.price == null ? s.label : `${s.label} · ${formatPrice(s.price)}`))),
    el("label", { class: "row" }, toggle, "On the menu this season"),
    el("div", { class: "row" },
      el("button", { class: "button button-secondary", type: "button", onclick: () => openEditor(item) }, "Edit"),
      el("button", { class: "button button-danger", type: "button", onclick: () => remove(item) }, "Delete"),
    ),
  );
}

function sortSizes(sizes) {
  return [...(sizes ?? [])].sort((a, b) => a.sort_order - b.sort_order);
}

function sizeRow(size = {}) {
  const label = el("input", { placeholder: "Size", value: size.label ?? "", list: "size-presets", "aria-label": "Size" });
  const price = el("input", { type: "number", step: "0.01", min: "0", placeholder: "Price (optional)", value: size.price ?? "", "aria-label": "Price" });
  const row = el("div", { class: "size-row" }, label, price,
    el("button", { class: "button button-secondary", type: "button", onclick: () => row.remove(), "aria-label": "Remove size" }, "✕"),
  );
  row.read = () => ({ label: label.value.trim(), price: numberOrNull(price.value) });
  return row;
}

function openEditor(item = { menu: currentMenu }) {
  const categories = [...new Set(items.map((i) => i.category))];
  const menu = el("select", {},
    el("option", { value: "onsite", selected: item.menu === "onsite" }, "On-site (markets & events)"),
    el("option", { value: "private", selected: item.menu === "private" }, "Private clients"),
  );
  const name = el("input", { required: true, value: item.name ?? "" });
  const category = el("input", { required: true, value: item.category ?? "", list: "category-list", placeholder: "e.g. Cold brew, Lattes, Seasonal" });
  const description = el("textarea", { value: item.description ?? "" });
  const order = el("input", { type: "number", value: item.sort_order ?? 0 });
  const active = checkbox("On the menu this season", "is_active", item.is_active ?? true);
  const image = imageField(item.image_url);
  const sizes = el("div", { class: "form" }, sortSizes(item.menu_item_sizes).map(sizeRow));
  if (!item.id) sizes.append(sizeRow());
  const msg = el("div", { "aria-live": "polite" });

  const form = el("form", { class: "form card" },
    el("h2", {}, item.id ? "Edit product" : "New product"),
    el("datalist", { id: "category-list" }, categories.map((c) => el("option", { value: c }))),
    el("datalist", { id: "size-presets" }, SIZE_PRESETS.map((s) => el("option", { value: s }))),
    field("Menu", menu),
    field("Name", name),
    field("Category", category),
    field("Description (optional)", description),
    el("div", { class: "field" }, el("label", {}, "Sizes & prices"), sizes,
      el("button", { class: "button button-secondary", type: "button", onclick: () => sizes.append(sizeRow()) }, "+ Add size"),
    ),
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
        menu: menu.value,
        name: name.value.trim(),
        category: category.value.trim(),
        description: description.value.trim() || null,
        sort_order: Number(order.value) || 0,
        is_active: active.querySelector("input").checked,
        image_url: await image.resolve("menu"),
      };
      const saved = item.id
        ? await supabase.from("menu_items").update(row).eq("id", item.id).select("id").single()
        : await supabase.from("menu_items").insert(row).select("id").single();
      if (saved.error) throw saved.error;
      const id = saved.data.id;

      // Reemplaza los tamaños completos: es más simple que comparar uno por uno.
      const del = await supabase.from("menu_item_sizes").delete().eq("menu_item_id", id);
      if (del.error) throw del.error;
      const newSizes = [...sizes.children]
        .map((r, i) => ({ ...r.read(), sort_order: i, menu_item_id: id }))
        .filter((s) => s.label);
      if (newSizes.length) {
        const ins = await supabase.from("menu_item_sizes").insert(newSizes);
        if (ins.error) throw ins.error;
      }
      currentMenu = row.menu;
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

async function remove(item) {
  if (!confirm(`Delete "${item.name}"? To hide it for the season, uncheck "On the menu" instead.`)) return;
  const { error } = await supabase.from("menu_items").delete().eq("id", item.id);
  if (error) return alert("Couldn't delete. Please try again.");
  load();
}

tabs.forEach((t) => t.addEventListener("click", () => { currentMenu = t.dataset.menu; render(); }));
document.getElementById("new-item").addEventListener("click", () => openEditor());
load();
