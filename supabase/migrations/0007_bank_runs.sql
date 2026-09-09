-- De generatie zelf, fase voor fase.
--
-- De methode is geen open onderzoeksopdracht maar een vaste reeks stappen:
-- panel, oogst per site, consolidatie, basislaag, overlays, facetten. Daarom is
-- een run hier geen zwarte doos maar een rij met een fase-teller: elke beurt
-- zet één stap, bewaart wat eruit kwam, en stopt. Dat lost drie dingen tegelijk
-- op die een agentische opzet allemaal openlaat.
--
-- 1. **Hervatten.** Valt de generatie om bij site vier, dan begint de volgende
--    beurt bij site vier en niet bij fase 0. Zonder dit kost elke storing het
--    hele onderzoek opnieuw, en dat is precies waar dit eerder op vastliep.
-- 2. **Kosten.** Per fase staat er wat hij aan tokens kostte. Een markt die
--    ontspoort is daarmee zichtbaar in plaats van pas op de rekening.
-- 3. **Beoordelen.** De tussenuitkomst per fase blijft staan, dus bij een bank
--    die raar uitvalt is na te lopen wélke stap hem raar maakte.
--
-- Eén run per aanvraag: de aanvraag is al uniek per markt, en twee runs op
-- dezelfde markt zouden twee meetlatten opleveren.

create table if not exists bank_runs (
  id uuid primary key default gen_random_uuid(),

  request_id uuid not null unique references bank_requests(id) on delete cascade,

  -- Ook hier, ook al hangt hij aan de aanvraag: elke tabel die merchant-data
  -- raakt draagt een account_id. Achteraf toevoegen is een migratie op data die
  -- er al staat.
  account_id uuid not null references accounts(id) on delete cascade,

  -- Welke stap als eerstvolgende gezet wordt. Niet welke gezet ís: een beurt
  -- die halverwege afbreekt mag geen halve stap achterlaten.
  phase text not null default 'panel',

  -- Alles wat de fasen tot nu toe opleverden, in de vorm die `src/generation`
  -- leest. Als één document en niet uitgesplitst in kolommen: de vorm hoort in
  -- de code te staan die hem schrijft, niet in een schema dat bij elke
  -- methodewijziging mee moet migreren.
  state jsonb not null default '{}'::jsonb,

  -- Hoe vaak deze fase al geprobeerd is. Drie keer stuk is geen pech meer maar
  -- een fout, en dan hoort er een mens naar te kijken in plaats van dat het
  -- model het een vierde keer op onze rekening probeert.
  attempts integer not null default 0,

  -- Wat er tot nu toe verstookt is, per fase opgeteld. In tokens en niet in
  -- euro's: de prijs per model verandert, het aantal tokens is wat we deden.
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  cached_tokens bigint not null default 0,

  -- Tot wanneer deze run van één beurt is.
  --
  -- Apart van `updated_at`, en dat verschil is het hele punt: een fase die vijf
  -- sites leest duurt minuten en mag intussen niet nog een keer opgepakt worden,
  -- maar zodra hij klaar is moet de volgende beurt meteen door kunnen. Zou de
  -- grendel aan `updated_at` hangen, dan zou elke stap de leestijd uitzitten en
  -- duurde een markt dagen in plaats van uren.
  leased_until timestamptz,

  -- De laatste fout, zodat het beheerscherm kan zeggen wat er misging.
  failure text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bank_runs_phase_idx on bank_runs (phase, updated_at);

alter table bank_runs enable row level security;

-- Geen leesbeleid: een run is werk van ons en geen merchant-inzage. Het
-- beheerscherm en de generator draaien allebei op de servicesleutel, buiten row
-- level security om.

-- De groepering die de generatie voorstelt: welke categorie een eigen overlay
-- verdient, welke een toepassingsprofiel wordt, en welke eigenlijk een facet is.
--
-- Dit is het enige echte oordeel in de hele keten, en het hoort daarom bij wat
-- de beheerder vaststelt. Het staat op de aanvraag en niet alleen in de run,
-- want het overleeft de run: de bank die eruit komt rust erop.
alter table bank_requests add column if not exists grouping jsonb not null default '[]'::jsonb;

-- Dezelfde groepering bij de bank zelf, zodat een vrijgegeven bank kan tonen op
-- welke indeling hij rust zonder terug te hoeven naar de aanvraag die hem
-- veroorzaakte.
alter table question_banks add column if not exists grouping jsonb not null default '[]'::jsonb;

-- Een aanvraag die door de generator wordt opgepakt gaat naar `running`; die
-- status bestond al. Wat er bij komt is `blocked`: drie keer dezelfde fase stuk.
-- Geen mislukking van de bank — er ís nog geen bank — maar van de generatie, en
-- dat verschil bepaalt of er iets te repareren valt of iets te herstarten.
alter table bank_requests drop constraint if exists bank_requests_status_check;
alter table bank_requests add constraint bank_requests_status_check
  check (status in ('queued', 'running', 'blocked', 'review', 'ready', 'failed'));

-- Een geblokkeerde aanvraag blijft de openstaande aanvraag voor zijn markt.
-- Zou hij dat niet zijn, dan zet de volgende merchant in dezelfde markt er een
-- tweede naast en draait hetzelfde onderzoek nog een keer — terwijl de eerste
-- juist op een mens wacht.
drop index if exists bank_requests_open_per_vertical;
create unique index if not exists bank_requests_open_per_vertical
  on bank_requests (vertical)
  where status in ('queued', 'running', 'blocked', 'review');
