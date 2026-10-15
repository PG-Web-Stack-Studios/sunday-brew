-- Datos de ejemplo para el preview (se borran antes de la entrega; ver el final del archivo).
-- Correr DESPUÉS de migrations/0001_init.sql. Las fechas se calculan desde hoy, en hora de Arizona.

-- Eventos: 5 farmers markets en las próximas semanas + uno oculto + uno pasado
insert into public.events (title, address, city, starts_at, ends_at, notes, is_published) values
  ('Downtown Phoenix Farmers Market', '721 N Central Ave', 'Phoenix',
   (current_date + 3 + time '08:00') at time zone 'America/Phoenix',
   (current_date + 3 + time '13:00') at time zone 'America/Phoenix', 'Find us near the main entrance.', true),
  ('Old Town Scottsdale Farmers Market', '3806 N Brown Ave', 'Scottsdale',
   (current_date + 4 + time '08:00') at time zone 'America/Phoenix',
   (current_date + 4 + time '13:00') at time zone 'America/Phoenix', null, true),
  ('Gilbert Farmers Market', '222 N Ash St', 'Gilbert',
   (current_date + 10 + time '08:00') at time zone 'America/Phoenix',
   (current_date + 10 + time '12:00') at time zone 'America/Phoenix', null, true),
  ('Mesa Community Farmers Market', '526 E Main St', 'Mesa',
   (current_date + 11 + time '09:00') at time zone 'America/Phoenix',
   (current_date + 11 + time '13:00') at time zone 'America/Phoenix', 'Cold cans available while supplies last.', true),
  ('Uptown Farmers Market', '5757 N Central Ave', 'Phoenix',
   (current_date + 17 + time '08:00') at time zone 'America/Phoenix',
   (current_date + 17 + time '12:00') at time zone 'America/Phoenix', null, true),
  ('Private pop-up (hidden)', 'TBD', 'Tempe',
   (current_date + 6 + time '15:00') at time zone 'America/Phoenix',
   (current_date + 6 + time '18:00') at time zone 'America/Phoenix', 'Only visible in the dashboard.', false),
  ('Past market (example)', '721 N Central Ave', 'Phoenix',
   (current_date - 4 + time '08:00') at time zone 'America/Phoenix',
   (current_date - 4 + time '13:00') at time zone 'America/Phoenix', null, true);

-- Menú
with items as (
  insert into public.menu_items (menu, category, name, description, sort_order) values
    ('onsite',  'Signature Lattes', 'Honey Lavender Latte', 'Espresso, oat milk, local honey and lavender.', 1),
    ('onsite',  'Signature Lattes', 'Brown Sugar Oat Latte', 'Espresso, brown sugar syrup and oat milk.', 2),
    ('onsite',  'Cold Brew',        'Sweet Cream Cold Brew', 'Slow-steeped cold brew with vanilla sweet cream.', 1),
    ('onsite',  'Seasonal',         'Pumpkin Spice Latte', 'Fall favorite with real pumpkin.', 1),
    ('private', 'Espresso Bar',     'Custom Latte Menu', 'Pick up to 4 signature lattes for your guests.', 1),
    ('private', 'Espresso Bar',     'Classic Espresso Drinks', 'Americano, cappuccino and lattes made to order.', 2),
    ('private', 'Signature Cans',   'Chilled Latte Cans', 'Pre-made lattes in our signature cans, delivered cold.', 1)
  returning id, name
)
insert into public.menu_item_sizes (menu_item_id, label, price, sort_order)
select i.id, s.label, s.price, s.sort_order
from items i
join (values
  ('Honey Lavender Latte',   '16 oz cup',          6.50, 0),
  ('Honey Lavender Latte',   '20 oz can over ice', 8.00, 1),
  ('Brown Sugar Oat Latte',  '16 oz cup',          6.50, 0),
  ('Brown Sugar Oat Latte',  '20 oz can over ice', 8.00, 1),
  ('Sweet Cream Cold Brew',  '20 oz can over ice', 7.50, 0),
  ('Sweet Cream Cold Brew',  '12 oz cold can',     6.00, 1),
  ('Pumpkin Spice Latte',    '16 oz cup',          7.00, 0),
  ('Custom Latte Menu',      '16 oz cup',          null, 0),
  ('Classic Espresso Drinks','16 oz cup',          null, 0),
  ('Chilled Latte Cans',     '12 oz cold can',     null, 0)
) as s(name, label, price, sort_order) on s.name = i.name;

-- Merch
insert into public.merch (name, description, price, sort_order) values
  ('Sunday Brew Trucker Hat', 'Embroidered logo, adjustable snapback.', 28.00, 1),
  ('Canvas Tote', 'Heavy cotton tote with the sunrise logo.', 22.00, 2),
  ('Sticker Pack', 'Three waterproof stickers.', null, 3);

-- Una solicitud de ejemplo para ver el panel
insert into public.booking_requests (name, email, phone, event_type, event_date, event_time, location,
                                     guest_count, service_type, setup_details, message)
values ('Demo Customer', 'demo@example.com', '+1 6025550123', 'Wedding', current_date + 30, '15:00',
        'Mesa — Desert Botanical venue', '51-100', 'custom_package', '{outdoor,ground_level}',
        'Example request so you can try the dashboard.');

-- Para borrar todo lo de ejemplo antes de la entrega:
-- delete from public.booking_requests where email = 'demo@example.com';
-- delete from public.events; delete from public.menu_items; delete from public.merch;
