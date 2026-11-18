export const SCHEMA = `
create table if not exists admins(
  id serial primary key, username text unique not null, password_hash text not null, name text, photo text);
create table if not exists settings(key text primary key, value text);
create table if not exists events(
  id serial primary key, name text not null, event_date date, place text,
  price_adult int not null default 1000, price_child int not null default 500,
  max_children int not null default 9, products_enabled boolean not null default true,
  archived boolean not null default false, created_at timestamptz default now());
create table if not exists promo_codes(
  id serial primary key, code text unique not null,
  kind text not null check (kind in ('percent','fixed')), value int not null,
  event_id int references events(id) on delete set null, expires_at date, max_uses int,
  uses int not null default 0, archived boolean not null default false);
create table if not exists orders(
  id serial primary key, code text unique not null, token text not null,
  event_id int references events(id), first_name text, last_name text, phone text, email text,
  adults int not null default 0, children int not null default 0,
  chance int not null default 0, protection int not null default 0,
  tickets_amount int not null default 0, products_amount int not null default 0,
  discount int not null default 0, total int not null, promo_code text,
  status text not null default 'pending', fedapay_id text, payment_method text,
  paid_at timestamptz, scanned_at timestamptz, created_at timestamptz default now());
create index if not exists orders_fedapay on orders(fedapay_id);
`;
