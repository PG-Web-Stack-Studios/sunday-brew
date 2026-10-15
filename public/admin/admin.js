// Utilidades compartidas del panel. El redirect al login es solo comodidad:
// la seguridad real la da RLS (is_admin()) en Supabase.
import { supabase, el } from "../js/lib.js";

export { supabase, el };

export async function requireAdmin() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    location.replace("login.html");
    return new Promise(() => {}); // detiene la página mientras redirige
  }
  const { data: admin } = await supabase.from("admins").select("user_id").eq("user_id", session.user.id).maybeSingle();
  if (!admin) {
    await supabase.auth.signOut();
    location.replace("login.html?denied=1");
    return new Promise(() => {});
  }

  document.getElementById("logout")?.addEventListener("click", async () => {
    await supabase.auth.signOut();
    location.replace("login.html");
  });
  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") location.replace("login.html");
  });
  document.querySelector("main").hidden = false;
  return session;
}

// Arizona no cambia de horario: siempre UTC-7.
const AZ_OFFSET = "-07:00";
const AZ_MS = 7 * 60 * 60 * 1000;

export function azDate(iso) {
  return new Date(new Date(iso).getTime() - AZ_MS).toISOString().slice(0, 10);
}
export function azTime(iso) {
  return new Date(new Date(iso).getTime() - AZ_MS).toISOString().slice(11, 16);
}
export function fromAz(date, time) {
  return new Date(`${date}T${time}:00${AZ_OFFSET}`).toISOString();
}

export function field(label, input, hint) {
  if (!input.id) input.id = `f-${Math.random().toString(36).slice(2, 9)}`;
  return el("div", { class: "field" },
    el("label", { for: input.id }, label),
    input,
    hint && el("span", { class: "field-hint" }, hint),
  );
}

export function checkbox(label, name, checked) {
  const input = el("input", { type: "checkbox", name, checked });
  input.style.width = "auto";
  return el("label", { class: "row" }, input, label);
}

export function numberOrNull(v) {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function flash(container, text, ok = true) {
  container.replaceChildren(el("p", { class: `notice ${ok ? "notice-success" : "notice-error"}` }, text));
}

export async function uploadImage(file, folder) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("public-images").upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type || undefined,
  });
  if (error) throw error;
  return supabase.storage.from("public-images").getPublicUrl(path).data.publicUrl;
}

// Campo de foto: muestra la actual y permite cambiarla o quitarla.
export function imageField(currentUrl) {
  const state = { url: currentUrl || null, file: null };
  const preview = el("img", { class: "card-image", alt: "", src: currentUrl || "", hidden: !currentUrl });
  preview.style.maxWidth = "200px";
  const input = el("input", { type: "file", accept: "image/*" });
  const remove = el("button", { type: "button", class: "button button-secondary", hidden: !currentUrl }, "Remove photo");
  input.addEventListener("change", () => {
    state.file = input.files[0] || null;
    if (state.file) {
      preview.src = URL.createObjectURL(state.file);
      preview.hidden = false;
      remove.hidden = false;
    }
  });
  remove.addEventListener("click", () => {
    state.url = null;
    state.file = null;
    input.value = "";
    preview.hidden = true;
    remove.hidden = true;
  });
  const node = el("div", { class: "field" }, el("label", {}, "Photo (optional)"), preview, input, remove);
  return {
    node,
    async resolve(folder) {
      return state.file ? uploadImage(state.file, folder) : state.url;
    },
  };
}
