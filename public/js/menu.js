import { supabase, el, formatPrice, showError } from "./lib.js";

const container = document.getElementById("menu");
const tabs = document.querySelectorAll("[data-menu]");

const { data, error } = await supabase
  .from("menu_items")
  .select("id, menu, category, name, description, image_url, sort_order, menu_item_sizes(label, price, sort_order)")
  .eq("is_active", true)
  .order("category")
  .order("sort_order");

function render(menu) {
  tabs.forEach((t) => {
    const on = t.dataset.menu === menu;
    t.setAttribute("aria-selected", on);
    t.classList.toggle("button-secondary", !on);
  });
  if (error) return showError(container);

  const items = data.filter((i) => i.menu === menu);
  if (!items.length) {
    container.replaceChildren(el("p", { class: "muted" }, "Menu coming soon."));
    return;
  }

  const byCategory = new Map();
  for (const item of items) {
    if (!byCategory.has(item.category)) byCategory.set(item.category, []);
    byCategory.get(item.category).push(item);
  }

  container.replaceChildren(
    ...[...byCategory].map(([category, list]) =>
      el("section", { class: "menu-category" },
        el("h2", {}, category),
        el("ul", { class: "card-list" },
          list.map((item) => {
            const sizes = [...item.menu_item_sizes].sort((a, b) => a.sort_order - b.sort_order);
            return el("li", { class: "card" },
              item.image_url && el("img", { class: "card-image", src: item.image_url, alt: item.name, loading: "lazy" }),
              el("h3", {}, item.name),
              item.description && el("p", { class: "card-meta" }, item.description),
              sizes.length > 0 && el("ul", { class: "sizes" },
                sizes.map((s) => el("li", {}, s.price == null ? s.label : `${s.label} · ${formatPrice(s.price)}`)),
              ),
            );
          }),
        ),
      ),
    ),
  );
}

tabs.forEach((t) => t.addEventListener("click", () => render(t.dataset.menu)));
render("onsite");
