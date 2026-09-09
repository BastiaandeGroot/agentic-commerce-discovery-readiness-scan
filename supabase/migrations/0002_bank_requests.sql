-- De wachtrij achter een vragenbank.
--
-- Een merchant levert zijn catalogus aan en bevestigt zijn categorieën; daarna
-- ontstaat hier een aanvraag. Kennen we zijn markt al, dan is er niets aan te
-- vragen en scant hij meteen. Kennen we hem niet, dan is dit de taak die
-- doorloopt nadat hij zijn browser sluit, en de reden dat hij een mail krijgt.
--
-- Twee dingen die deze tabel met opzet níet draagt:
--
-- 1. Geen productdata. Categorienamen met aantallen en de URL van de winkel,
--    verder niets — ook geen kolomnamen. Dat is fase 3 van de methode
--    (blinderen) en tegelijk de privacybelofte. Zou hier een productrij in
--    kunnen, dan zou de belofte van het type afhangen in plaats van van de vorm.
-- 2. Geen merchantspecifieke vragen. Een bank hoort bij een markt en wordt
--    hergebruikt; `vertical` is daarom de sleutel waarop een volgende merchant
--    hem terugvindt. De segmenten zeggen wélke overlays onderzocht moeten
--    worden, niet wat erin komt te staan.

create table if not exists bank_requests (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,

  -- De markt waarvoor de bank gemaakt wordt. Kleine letters, streepjes:
  -- twee merchants in dezelfde markt moeten op dezelfde sleutel uitkomen.
  vertical text not null,

  -- De marktsegmenten die een eigen overlay verdienen, zoals ze uit het
  -- categoriescherm komen. Namen met aantallen, geen paden met producten erin.
  segments jsonb not null default '[]'::jsonb,

  -- De winkel zelf. Eén van de vijf à acht panelsites, nooit de enige bron.
  site_url text,

  -- Webshops die de merchant aandroeg. Een suggestie en niet het panel: zijn
  -- inbreng wordt toegevoegd aan wat de uitvoerder zelf vindt, want een merchant
  -- die zijn panel bepaalt kiest zijn zwakste concurrenten.
  suggested_sites jsonb not null default '[]'::jsonb,

  -- Het panel zoals het uiteindelijk gebruikt is, met datum per site. Wordt
  -- gevuld door de uitvoerder en is voor de merchant zichtbaar: hij moet kunnen
  -- beoordelen of hij deze meetlat vertrouwt.
  panel jsonb not null default '[]'::jsonb,

  status text not null default 'queued'
    check (status in ('queued', 'running', 'review', 'ready', 'failed')),

  -- Waarom het misging, in mensentaal, zodat het scherm iets kan zeggen.
  failure text,

  -- Wat de poorten markeerden en dus door een mens bekeken moet worden.
  -- Leeg bij 'ready'. De vragen zelf staan niet hier maar in de bank.
  flagged jsonb not null default '[]'::jsonb,

  requested_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,

  -- Of de merchant al bericht heeft gehad. Los van finished_at, want een mail
  -- die niet aankwam mag opnieuw verstuurd worden zonder de taak te herstarten.
  notified_at timestamptz
);

-- Eén openstaande aanvraag per markt. Twee merchants die dezelfde dag in
-- dezelfde markt aankomen horen op dezelfde taak te wachten, niet twee keer
-- hetzelfde onderzoek te laten draaien.
create unique index if not exists bank_requests_open_per_vertical
  on bank_requests (vertical)
  where status in ('queued', 'running', 'review');

create index if not exists bank_requests_account_idx
  on bank_requests (account_id, requested_at desc);

alter table bank_requests enable row level security;

drop policy if exists bank_requests_read on bank_requests;
create policy bank_requests_read on bank_requests
  for select using (
    exists (select 1 from account_members m
            where m.account_id = bank_requests.account_id and m.user_id = auth.uid())
  );

drop policy if exists bank_requests_write on bank_requests;
create policy bank_requests_write on bank_requests
  for insert with check (
    exists (select 1 from account_members m
            where m.account_id = bank_requests.account_id and m.user_id = auth.uid())
  );

-- Bijwerken doet de werker, en die draait met de servicesleutel buiten row level
-- security om. Een merchant mag zijn eigen aanvraag niet op 'ready' zetten.
