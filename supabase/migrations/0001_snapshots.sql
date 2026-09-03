-- Bewaarde scans, serverzijdig.
--
-- Nog niet in gebruik: er is geen Supabase-project aangesloten. Dit staat er
-- alvast omdat de vorm nu vastligt en later aansluiten dan een configuratie is
-- in plaats van een verbouwing.
--
-- Twee dingen zijn met opzet zo:
--
-- 1. account_id staat op elke rij. Achteraf toevoegen betekent een migratie op
--    data die er al staat.
-- 2. Er gaat geen productdata in. Een snapshot draagt tellingen, categorienamen
--    en veldnamen — niet de catalogus zelf. Wat een merchant aanlevert blijft
--    daarmee ook na het bewaren op zijn eigen apparaat.

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists account_members (
  account_id uuid not null references accounts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (account_id, user_id)
);

create table if not exists scan_snapshots (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  saved_at timestamptz not null default now(),
  label text not null,

  -- De drie versienummers staan als kolom en niet alleen in de payload, zodat
  -- "vergelijk deze twee" kan weigeren zonder eerst json te moeten uitpakken.
  scan_version text not null,
  spec_snapshot text not null,
  question_set_version integer not null,

  feed_name text not null,
  catalog_name text,
  product_count integer not null,
  unmatched_count integer not null,

  -- De uitkomst per protocol; de vorm staat in src/engine/snapshot.ts.
  protocols jsonb not null
);

create index if not exists scan_snapshots_account_saved_idx
  on scan_snapshots (account_id, saved_at desc);

-- Niemand ziet ooit andermans scans. Dit is de regel die dat afdwingt, niet de
-- query in de applicatie: een vergeten where-clausule mag geen datalek zijn.
alter table accounts enable row level security;
alter table account_members enable row level security;
alter table scan_snapshots enable row level security;

create policy account_members_self on account_members
  for select using (user_id = auth.uid());

create policy accounts_visible_to_members on accounts
  for select using (
    exists (select 1 from account_members m where m.account_id = accounts.id and m.user_id = auth.uid())
  );

create policy snapshots_read on scan_snapshots
  for select using (
    exists (select 1 from account_members m
            where m.account_id = scan_snapshots.account_id and m.user_id = auth.uid())
  );

create policy snapshots_write on scan_snapshots
  for insert with check (
    exists (select 1 from account_members m
            where m.account_id = scan_snapshots.account_id and m.user_id = auth.uid())
  );

create policy snapshots_delete on scan_snapshots
  for delete using (
    exists (select 1 from account_members m
            where m.account_id = scan_snapshots.account_id and m.user_id = auth.uid())
  );
