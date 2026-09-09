-- De vragenbanken zelf, en de velden om vertraging te kunnen melden.
--
-- Een bank hoort bij een markt en niet bij een account. Dat is de beslissing
-- waar alles omheen hangt: twee merchants in dezelfde markt moeten langs
-- dezelfde meetlat, anders is vergelijken zinloos — en dat vergelijken is het
-- bestaansrecht van de bank. De aanvraag hoort wél bij een account.

create table if not exists question_banks (
  id uuid primary key default gen_random_uuid(),

  -- Kleine letters met streepjes. Twee merchants in dezelfde markt moeten op
  -- dezelfde sleutel uitkomen, anders krijgen ze elk hun eigen bank.
  vertical text not null,

  -- Oplopend per markt. Een bevroren bank verandert nooit; een herziening is een
  -- nieuwe versie ernaast, zodat een oud rapport zijn meetlat houdt.
  version integer not null default 1,

  status text not null default 'review'
    check (status in ('review', 'ready', 'frozen', 'withdrawn')),

  -- De vragenlijst zoals de uitvoerder hem aanleverde, in de vorm die de app
  -- inleest. Als tekst en niet uitgepakt: de lezer in de app is de enige plek
  -- waar de vorm wordt uitgelegd, en die mag niet op twee plekken staan.
  csv text not null,

  -- Wat de poorten markeerden en dus door een mens bekeken moet worden. Leeg bij
  -- een bank die zonder bevindingen doorkwam.
  findings jsonb not null default '[]'::jsonb,

  -- Het panel waarop deze bank rust: naam, url, type en datum per site. Voor de
  -- merchant zichtbaar, want hij moet kunnen beoordelen of hij deze meetlat
  -- vertrouwt.
  panel jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now(),
  released_at timestamptz,
  released_by uuid references auth.users(id) on delete set null,

  unique (vertical, version)
);

create index if not exists question_banks_vertical_idx
  on question_banks (vertical, version desc);

alter table question_banks enable row level security;

-- Iedereen die is ingelogd mag een vrijgegeven bank lezen: hij hoort bij de
-- markt en niet bij één account, en de merchant moet zijn eigen meetlat kunnen
-- inzien. Een bank die nog in review staat is van ons.
drop policy if exists question_banks_read on question_banks;
create policy question_banks_read on question_banks
  for select using (auth.uid() is not null and status in ('ready', 'frozen'));

-- Schrijven doet alleen de uitvoerder, en die draait met de servicesleutel
-- buiten row level security om. Een merchant hoort zijn eigen bank niet te
-- kunnen klaarzetten.

-- Vertraging kunnen melden zonder de taak te herstarten. Twee losse momenten:
-- na één werkdag hoort de beheerder het, na twee de merchant.
alter table bank_requests add column if not exists admin_notified_at timestamptz;
alter table bank_requests add column if not exists merchant_notified_at timestamptz;

-- Welke bank uit deze aanvraag kwam, zodat het bericht naar de juiste mensen kan.
alter table bank_requests add column if not exists bank_id uuid references question_banks(id) on delete set null;
