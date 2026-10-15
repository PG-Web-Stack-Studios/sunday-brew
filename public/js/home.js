import { supabase } from "./lib.js";

const { data } = await supabase.from("site_settings").select("value").eq("key", "home_story").maybeSingle();
const story = typeof data?.value === "string" ? data.value.trim() : "";
if (story) {
  const box = document.getElementById("home-story");
  box.replaceChildren(...story.split(/\n{2,}/).map((p) => Object.assign(document.createElement("p"), { textContent: p })));
}
