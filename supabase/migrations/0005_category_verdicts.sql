-- Wat de merchant besliste over zijn eigen categorieboom.
--
-- Zonder dit wordt zijn oordeel elke scan opnieuw gevraagd, en het voorstel dat
-- hij dan krijgt kan anders zijn: gemeten op de echte catalogus wisselden 8 van
-- de 54 paden tussen drie identieke aanroepen, allemaal in de gevallen waar een
-- mens ook zou twijfelen — linnen, velours, verduisterend.
--
-- Dat is erger dan het klinkt. Twee scans van dezelfde winkel zouden dan op
-- verschillende definities kunnen rusten, en dan lijkt er vooruitgang die er niet
-- is. Vergelijken over tijd is precies waar dit product voor bedoeld is.
--
-- De oplossing is niet een beter model maar bevriezen: hij beslist één keer, en
-- bij een volgende scan wordt alleen nog voorgesteld wat er nieuw bij kwam.
--
-- Hoort bij het account en niet bij de markt: dit gaat over zíjn boom.

create table if not exists category_verdicts (
  account_id uuid not null references accounts(id) on delete cascade,

  -- Het genormaliseerde pad, zoals `pathKey()` in src/intake/facets.ts het maakt.
  -- Genormaliseerd zodat een andere schrijfwijze in een volgende export hetzelfde
  -- pad blijft: "Meubelstoffen > Effen" en "meubelstoffen/effen" zijn één ding.
  path_key text not null,

  -- Het pad zoals het in zijn data stond, om te kunnen tonen wat hij besliste.
  segments jsonb not null default '[]'::jsonb,

  kind text not null check (kind in ('category', 'facet')),

  decided_at timestamptz not null default now(),

  primary key (account_id, path_key)
);

create index if not exists category_verdicts_account_idx
  on category_verdicts (account_id);

alter table category_verdicts enable row level security;

drop policy if exists category_verdicts_read on category_verdicts;
create policy category_verdicts_read on category_verdicts
  for select using (
    exists (select 1 from account_members m
            where m.account_id = category_verdicts.account_id and m.user_id = auth.uid())
  );

drop policy if exists category_verdicts_write on category_verdicts;
create policy category_verdicts_write on category_verdicts
  for insert with check (
    exists (select 1 from account_members m
            where m.account_id = category_verdicts.account_id and m.user_id = auth.uid())
  );

drop policy if exists category_verdicts_update on category_verdicts;
create policy category_verdicts_update on category_verdicts
  for update using (
    exists (select 1 from account_members m
            where m.account_id = category_verdicts.account_id and m.user_id = auth.uid())
  );
