import { supabase, requireAdmin, flash } from "./admin.js";

await requireAdmin();

const KEYS = ["amazon_storefront_url", "stan_store_url", "home_story"];
const form = document.getElementById("settings-form");
const status = document.getElementById("form-status");

const { data } = await supabase.from("site_settings").select("key, value").in("key", KEYS);
for (const row of data ?? []) {
  if (form.elements[row.key] && typeof row.value === "string") form.elements[row.key].value = row.value;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!form.reportValidity()) return;
  const rows = KEYS.map((key) => ({ key, value: form.elements[key].value.trim() }));
  const { error } = await supabase.from("site_settings").upsert(rows);
  flash(status, error ? "Couldn't save. Please try again." : "Saved!", !error);
});
