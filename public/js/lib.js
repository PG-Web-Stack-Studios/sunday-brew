import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";

const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.SB_CONFIG;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const TZ = "America/Phoenix"; // Arizona: UTC-7 todo el año, sin horario de verano

// Crea un elemento con texto seguro (nunca innerHTML con datos de la base).
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") node.className = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else if (k in node && k !== "list") node[k] = v;
    else node.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c instanceof Node ? c : String(c));
  }
  return node;
}

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: TZ, weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
}

export function formatTime(iso) {
  return new Date(iso).toLocaleTimeString("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
}

export function formatPrice(n) {
  return n == null ? "" : `$${Number(n).toFixed(2)}`;
}

export function mapsUrl(...parts) {
  const q = parts.filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export function showError(container, msg = "Something went wrong. Please try again later.") {
  container.replaceChildren(el("p", { class: "notice notice-error" }, msg));
}
