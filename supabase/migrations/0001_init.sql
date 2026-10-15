-- Sunday Brew Coffee — esquema inicial
-- "Automatically expose new tables" está OFF, así que todos los permisos
-- se conceden explícitamente con GRANT. La seguridad real la da RLS.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Admins
-- ---------------------------------------------------------------------------
create table public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------
create table public.events (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  address      text not null,
  city         text,
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  notes        text,
  is_published boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (ends_at >= starts_at)
);
create index events_starts_at_idx on public.events (starts_at);

create table public.menu_items (
  id          uuid primary key default gen_random_uuid(),
  menu        text not null check (menu in ('onsite', 'private')),
  category    text not null default 'Drinks',
  name        text not null,
  description text,
  image_url   text,
  is_active   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index menu_items_menu_idx on public.menu_items (menu, category, sort_order);

create table public.menu_item_sizes (
  id           uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references public.menu_items (id) on delete cascade,
  label        text not null,
  price        numeric(8, 2),
  sort_order   int not null default 0
);
create index menu_item_sizes_item_idx on public.menu_item_sizes (menu_item_id, sort_order);

create table public.merch (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  price       numeric(8, 2),
  image_url   text,
  is_active   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.booking_requests (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  email          text not null,
  phone          text,
  event_type     text,
  event_date     date,
  event_time     text,
  location       text,
  guest_count    text check (guest_count in ('0-25', '26-50', '51-100', '100+')),
  service_type   text check (service_type in ('custom_package', 'cans_20oz', 'cans_12oz_dropoff', 'not_sure', 'other')),
  setup_details  text[] not null default '{}',
  message        text,
  status         text not null default 'new'
                 check (status in ('new', 'contacted', 'quoted', 'pending_payment', 'paid', 'completed', 'cancelled')),
  internal_notes text,
  quoted_amount  numeric(10, 2),
  paid_amount    numeric(10, 2),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index booking_requests_status_idx on public.booking_requests (status, created_at desc);

create table public.site_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

create trigger events_updated_at before update on public.events
  for each row execute function public.set_updated_at();
create trigger menu_items_updated_at before update on public.menu_items
  for each row execute function public.set_updated_at();
create trigger merch_updated_at before update on public.merch
  for each row execute function public.set_updated_at();
create trigger booking_requests_updated_at before update on public.booking_requests
  for each row execute function public.set_updated_at();
create trigger site_settings_updated_at before update on public.site_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.admins           enable row level security;
alter table public.events           enable row level security;
alter table public.menu_items       enable row level security;
alter table public.menu_item_sizes  enable row level security;
alter table public.merch            enable row level security;
alter table public.booking_requests enable row level security;
alter table public.site_settings    enable row level security;

-- admins: cada admin puede ver la tabla (para saber que es admin); nadie la edita desde el navegador
create policy "admins read" on public.admins
  for select to authenticated using (public.is_admin());

-- events
create policy "events public read" on public.events
  for select to anon, authenticated using (is_published or public.is_admin());
create policy "events admin insert" on public.events
  for insert to authenticated with check (public.is_admin());
create policy "events admin update" on public.events
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "events admin delete" on public.events
  for delete to authenticated using (public.is_admin());

-- menu_items
create policy "menu_items public read" on public.menu_items
  for select to anon, authenticated using (is_active or public.is_admin());
create policy "menu_items admin insert" on public.menu_items
  for insert to authenticated with check (public.is_admin());
create policy "menu_items admin update" on public.menu_items
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "menu_items admin delete" on public.menu_items
  for delete to authenticated using (public.is_admin());

-- menu_item_sizes: visibles si su producto está activo
create policy "menu_item_sizes public read" on public.menu_item_sizes
  for select to anon, authenticated using (
    public.is_admin()
    or exists (select 1 from public.menu_items m where m.id = menu_item_id and m.is_active)
  );
create policy "menu_item_sizes admin insert" on public.menu_item_sizes
  for insert to authenticated with check (public.is_admin());
create policy "menu_item_sizes admin update" on public.menu_item_sizes
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "menu_item_sizes admin delete" on public.menu_item_sizes
  for delete to authenticated using (public.is_admin());

-- merch
create policy "merch public read" on public.merch
  for select to anon, authenticated using (is_active or public.is_admin());
create policy "merch admin insert" on public.merch
  for insert to authenticated with check (public.is_admin());
create policy "merch admin update" on public.merch
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "merch admin delete" on public.merch
  for delete to authenticated using (public.is_admin());

-- site_settings: todo es público (links y textos)
create policy "site_settings public read" on public.site_settings
  for select to anon, authenticated using (true);
create policy "site_settings admin insert" on public.site_settings
  for insert to authenticated with check (public.is_admin());
create policy "site_settings admin update" on public.site_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "site_settings admin delete" on public.site_settings
  for delete to authenticated using (public.is_admin());

-- booking_requests: nada para anon (el insert lo hace el Worker con la llave secreta)
create policy "booking_requests admin read" on public.booking_requests
  for select to authenticated using (public.is_admin());
create policy "booking_requests admin update" on public.booking_requests
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "booking_requests admin delete" on public.booking_requests
  for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- GRANTs (auto-expose apagado)
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;

grant select on public.events, public.menu_items, public.menu_item_sizes, public.merch, public.site_settings
  to anon, authenticated;
grant insert, update, delete on public.events, public.menu_items, public.menu_item_sizes, public.merch, public.site_settings
  to authenticated;
grant select, update, delete on public.booking_requests to authenticated;
grant select on public.admins to authenticated;

grant all on all tables in schema public to service_role;

-- ---------------------------------------------------------------------------
-- Storage: bucket público para fotos (menú, merch, inicio)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('public-images', 'public-images', true)
on conflict (id) do nothing;

create policy "public-images admin read" on storage.objects
  for select to authenticated using (bucket_id = 'public-images' and public.is_admin());
create policy "public-images admin insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'public-images' and public.is_admin());
create policy "public-images admin update" on storage.objects
  for update to authenticated using (bucket_id = 'public-images' and public.is_admin());
create policy "public-images admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'public-images' and public.is_admin());

-- ---------------------------------------------------------------------------
-- Ajustes iniciales
-- ---------------------------------------------------------------------------
insert into public.site_settings (key, value) values
  ('amazon_storefront_url', '""'),
  ('stan_store_url', '""'),
  ('home_story', '""')
on conflict (key) do nothing;

-- Admins: crear los usuarios de Marion y Daniel en Authentication → Users
-- y luego registrar sus ids aquí:
-- insert into public.admins (user_id)
-- select id from auth.users where email in ('marion@…', 'daniel@…');
