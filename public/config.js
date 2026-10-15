// Valores públicos. La llave publishable (anon) es segura en el navegador: RLS protege los datos.
window.SB_CONFIG = {
  SUPABASE_URL: "https://YOUR-PROJECT.supabase.co",
  SUPABASE_ANON_KEY: "YOUR-PUBLISHABLE-KEY",
  // En GitHub Pages no hay backend; el formulario funciona cuando el sitio pase a Cloudflare.
  BOOKING_API_URL: "/api/booking",
};
