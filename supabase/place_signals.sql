create table if not exists public.place_signals (
  id uuid primary key default gen_random_uuid(),
  place_id text not null,
  signal_type text not null default 'star' check (signal_type = 'star'),
  created_at timestamptz not null default now()
);

create index if not exists place_signals_place_id_idx
on public.place_signals(place_id);

alter table public.place_signals enable row level security;
revoke all on table public.place_signals from anon, authenticated;
grant select, insert on table public.place_signals to service_role;
