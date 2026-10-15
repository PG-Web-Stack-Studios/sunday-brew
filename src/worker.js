// Worker de Cloudflare: sirve /public y atiende /api/booking.
// (Fase de preview en GitHub Pages: este archivo todavía no se despliega.)

// Campos del Google Form "Private Event Inquiry" de Sunday Brew.
const MAX = { name: 120, email: 200, phone: 40, event_type: 120, event_type_other: 120, event_time: 20, location: 200, message: 3000 };
const REQUIRED = { name: "your name", phone: "a phone number", event_type: "the event type", location: "the event location" };
const GUESTS = new Set(["0-25", "26-50", "51-100", "100+"]);
const SERVICES = {
  custom_package: "Custom Drink Package (on-site)",
  cans_20oz: "20 oz iced lattes in cans (on-site)",
  cans_12oz_dropoff: "12 oz chilled lattes in cans (drop-off)",
  not_sure: "Not sure yet, help me decide",
  other: "Other",
};
const SETUP = { indoor: "Indoor", outdoor: "Outdoor", ground_level: "Ground-level access" };
const RATE_LIMIT = { max: 5, windowMs: 10 * 60 * 1000 };
const hits = new Map(); // por isolate; complementa el honeypot, no es un límite global

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/booking") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      try {
        return await handleBooking(request, env);
      } catch (err) {
        console.error("booking failed", err);
        return json({ error: "We couldn't send your request. Please try again later." }, 500);
      }
    }
    return env.ASSETS.fetch(request);
  },
};

async function handleBooking(request, env) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  if (rateLimited(ip)) return json({ error: "Too many requests. Please try again in a few minutes." }, 429);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  // Honeypot y envíos demasiado rápidos: respondemos OK sin guardar nada.
  if (body.company || (Number(body.elapsed_ms) > 0 && Number(body.elapsed_ms) < 2500)) return json({ ok: true });

  const { data, error } = validate(body);
  if (error) return json({ error }, 400);

  const insert = await fetch(`${env.SUPABASE_URL}/rest/v1/booking_requests`, {
    method: "POST",
    headers: { ...supabaseHeaders(env.SUPABASE_SERVICE_ROLE_KEY), "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(data),
  });
  if (!insert.ok) throw new Error(`Supabase insert ${insert.status}: ${await insert.text()}`);

  // El aviso por correo no debe tumbar la solicitud: ya quedó guardada.
  try {
    await sendEmail(env, {
      to: env.BOOKING_NOTIFY_TO.split(",").map((s) => s.trim()),
      reply_to: data.email,
      subject: `New booking request: ${data.name}${data.event_date ? ` (${data.event_date})` : ""}`,
      text: ownerEmail(data),
    });
  } catch (err) {
    console.error("notify email failed", err);
  }

  return json({ ok: true });
}

function validate(b) {
  const data = {};
  for (const [key, max] of Object.entries(MAX)) {
    const v = typeof b[key] === "string" ? b[key].trim() : "";
    if (v.length > max) return { error: `"${key.replaceAll("_", " ")}" is too long.` };
    data[key] = v || null;
  }
  if (data.event_type === "Other" && data.event_type_other) data.event_type = data.event_type_other;
  delete data.event_type_other;

  for (const [key, label] of Object.entries(REQUIRED)) {
    if (!data[key]) return { error: `Please enter ${label}.` };
  }
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return { error: "Please enter a valid email." };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.event_date ?? "") || isNaN(Date.parse(b.event_date))) return { error: "Please enter a valid event date." };
  data.event_date = b.event_date;

  if (!GUESTS.has(b.guest_count)) return { error: "Please choose an estimated guest count." };
  data.guest_count = b.guest_count;

  if (!(b.service_type in SERVICES)) return { error: "Please choose a service." };
  data.service_type = b.service_type;

  const setup = Array.isArray(b.setup_details) ? b.setup_details : [];
  data.setup_details = [...new Set(setup.filter((s) => s in SETUP))];
  return { data };
}

function ownerEmail(d) {
  const lines = [
    ["Name", d.name], ["Email", d.email], ["Phone", d.phone], ["Event type", d.event_type],
    ["Date", d.event_date], ["Time", d.event_time], ["Location", d.location],
    ["Guests", d.guest_count], ["Service", SERVICES[d.service_type]],
    ["Setup", d.setup_details.map((k) => SETUP[k]).join(", ")], ["Details", d.message],
  ];
  return [
    "New booking request from the website:",
    "",
    ...lines.filter(([, v]) => v != null && v !== "").map(([k, v]) => `${k}: ${v}`),
    "",
    "Reply to this email to answer the customer directly.",
  ].join("\n");
}

async function sendEmail(env, { to, reply_to, subject, text }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: `Sunday Brew Website <${env.EMAIL_FROM}>`, to, reply_to, subject, text }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

// Llave secreta nueva (sb_secret_…) va solo en apikey; la legacy service_role (JWT) también como Bearer.
function supabaseHeaders(key) {
  const h = { apikey: key };
  if (key.startsWith("eyJ")) h.Authorization = `Bearer ${key}`;
  return h;
}

function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < RATE_LIMIT.windowMs);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > RATE_LIMIT.max;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
