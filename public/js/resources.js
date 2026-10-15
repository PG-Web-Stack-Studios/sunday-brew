import { supabase } from "./lib.js";

const { data } = await supabase
  .from("site_settings")
  .select("key, value")
  .in("key", ["amazon_storefront_url", "stan_store_url"]);

const settings = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));

function setLink(id, url) {
  if (typeof url !== "string" || !/^https?:\/\//.test(url)) return;
  const a = document.getElementById(`${id}-link`);
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener";
  a.hidden = false;
  document.getElementById(`${id}-pending`).hidden = true;
}

setLink("amazon", settings.amazon_storefront_url);
setLink("stan", settings.stan_store_url);
