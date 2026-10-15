import { supabase, el } from "../js/lib.js";

const form = document.getElementById("login-form");
const status = document.getElementById("form-status");

const { data: { session } } = await supabase.auth.getSession();
if (session && !new URLSearchParams(location.search).has("denied")) location.replace("index.html");

if (new URLSearchParams(location.search).has("denied")) {
  status.replaceChildren(el("p", { class: "notice notice-error" }, "This account doesn't have admin access."));
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const button = form.querySelector("button");
  button.disabled = true;
  const { email, password } = Object.fromEntries(new FormData(form));
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  button.disabled = false;
  if (error) {
    status.replaceChildren(el("p", { class: "notice notice-error" }, "Wrong email or password."));
    return;
  }
  location.replace("index.html");
});
