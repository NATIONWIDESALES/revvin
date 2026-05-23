
create table public.mock_listings (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  tagline text,
  category text not null,
  city text not null,
  region text not null,
  country text not null,
  lat double precision,
  lng double precision,
  hero_image text not null,
  gallery jsonb not null default '[]'::jsonb,
  services jsonb not null default '[]'::jsonb,
  price_min numeric,
  price_max numeric,
  currency text not null default 'USD',
  about text,
  rating numeric not null default 4.8,
  review_count int not null default 0,
  reviews jsonb not null default '[]'::jsonb,
  referral_fee numeric not null,
  referral_fee_unit text not null,
  verified boolean not null default true,
  phone text,
  email text,
  website text,
  hours jsonb,
  is_mock boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.mock_listings enable row level security;

create policy "Public can read mock listings"
  on public.mock_listings for select
  to anon, authenticated
  using (true);

create table public.mock_inquiries (
  id uuid primary key default gen_random_uuid(),
  listing_slug text not null,
  kind text not null,
  name text,
  email text,
  phone text,
  message text,
  is_mock boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.mock_inquiries enable row level security;

create policy "Anyone can submit mock inquiries"
  on public.mock_inquiries for insert
  to anon, authenticated
  with check (kind in ('contact','quote','referral'));

create policy "Admins read mock inquiries"
  on public.mock_inquiries for select
  to authenticated
  using (has_role(auth.uid(), 'admin'::app_role));

create table public.callback_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  business_name text,
  email text not null,
  phone text,
  city text,
  help_with text,
  is_mock boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.callback_requests enable row level security;

create policy "Anyone can submit callback requests"
  on public.callback_requests for insert
  to anon, authenticated
  with check (true);

create policy "Admins read callback requests"
  on public.callback_requests for select
  to authenticated
  using (has_role(auth.uid(), 'admin'::app_role));
