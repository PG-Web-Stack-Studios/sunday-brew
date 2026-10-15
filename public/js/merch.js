import { supabase, el, formatPrice, showError } from "./lib.js";

const list = document.getElementById("merch");

const { data, error } = await supabase
  .from("merch")
  .select("id, name, description, price, image_url")
  .eq("is_active", true)
  .order("sort_order");

if (error) {
  showError(list);
} else if (!data.length) {
  list.replaceChildren(el("li", { class: "muted" }, "Merch coming soon."));
} else {
  list.replaceChildren(
    ...data.map((m) =>
      el("li", { class: "card" },
        m.image_url && el("img", { class: "card-image", src: m.image_url, alt: m.name, loading: "lazy" }),
        el("h3", {}, m.name),
        m.description && el("p", {}, m.description),
        el("p", { class: "card-meta" }, m.price == null ? "Available at our markets" : `${formatPrice(m.price)} · Available at our markets`),
      ),
    ),
  );
}
