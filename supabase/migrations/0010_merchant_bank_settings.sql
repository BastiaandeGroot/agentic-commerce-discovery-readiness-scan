-- Wat de merchant op een vragenbank deed, bewaard bij zijn account.
--
-- Zonder dit stond de kenmerkkoppeling alleen in de browser, en was het
-- valideren van de vragensets na elke sessie weg — soms al binnen een sessie.
-- Een merchant die op een andere laptop verder wil, of die over drie maanden
-- opnieuw scant, begint dan opnieuw met honderden kenmerken en tientallen vragen.
--
-- Eén rij per account per markt. Per markt en niet per bankversie: de koppeling
-- hangt aan zijn kolomnamen en blijft geldig als de bank vernieuwd wordt. Wat
-- wél aan de versie hangt — welke vragen hij bevestigde — draagt zijn eigen
-- vingerafdruk in `question_work`, zodat een gewijzigde vraag opnieuw bevestigd
-- wordt in plaats van stil bevestigd te blijven.
--
-- Alleen namen: kenmerksleutels, kolomnamen, categorienamen, vraag-id's en de
-- tekst van eigen vragen. Geen productrij, geen waarde, geen prijs. De belofte
-- dat de catalogus het apparaat niet verlaat blijft zo overeind.

create table if not exists merchant_bank_settings (
  account_id uuid not null references accounts(id) on delete cascade,

  -- De markt van de bank, zoals `question_banks.vertical`.
  vertical text not null,

  -- De versie waarop dit werk gedaan is. Wisselt de bank, dan blijven de
  -- categoriekeuzes niet vanzelf staan: overlay-id's kunnen verschoven zijn.
  bank_version text not null default '',

  -- Kenmerksleutel -> kolomnamen.
  mapping jsonb not null default '{}'::jsonb,

  -- Eigen categorienaam -> overlay-id, of null voor "alleen de algemene vragen".
  categories jsonb not null default '{}'::jsonb,

  -- Uitgezette, aangepaste en eigen vragen, bevestigingen en de changelog. De
  -- vorm staat in src/questions/work.ts.
  question_work jsonb,

  updated_at timestamptz not null default now(),

  primary key (account_id, vertical)
);

alter table merchant_bank_settings enable row level security;

drop policy if exists merchant_bank_settings_read on merchant_bank_settings;
create policy merchant_bank_settings_read on merchant_bank_settings
  for select using (
    exists (select 1 from account_members m
            where m.account_id = merchant_bank_settings.account_id and m.user_id = auth.uid())
  );

drop policy if exists merchant_bank_settings_write on merchant_bank_settings;
create policy merchant_bank_settings_write on merchant_bank_settings
  for insert with check (
    exists (select 1 from account_members m
            where m.account_id = merchant_bank_settings.account_id and m.user_id = auth.uid())
  );

drop policy if exists merchant_bank_settings_update on merchant_bank_settings;
create policy merchant_bank_settings_update on merchant_bank_settings
  for update using (
    exists (select 1 from account_members m
            where m.account_id = merchant_bank_settings.account_id and m.user_id = auth.uid())
  );

-- Een categorie kan nu ook uitgesloten worden, naast categorie en kenmerk.
--
-- Uitgesloten betekent: dit pad en alles eronder hoort niet bij de meting. Geen
-- vragenset, geen kenmerken, en een product dat alleen hier hangt telt niet mee.
-- Het oordeel hoort bij de boom van de merchant, dus in dezelfde tabel.

alter table category_verdicts drop constraint if exists category_verdicts_kind_check;
alter table category_verdicts
  add constraint category_verdicts_kind_check check (kind in ('category', 'facet', 'excluded'));

-- Categorieën van een bank die los staan van het kernproduct, en gecorrigeerde labels.
--
-- Een losstaande categorie krijgt alleen haar eigen vragen: naaigaren heeft geen
-- baanbreedte en een onderhoudsmiddel geen slijtvastheid. De generatie kan dat
-- zelf vaststellen, maar een bank die er al ligt krijgt het hier, zonder opnieuw
-- gegenereerd te worden. Een label corrigeren is voor een bank die de schrijfwijze
-- van één winkel overnam ("Onderhoudsprodukten"); een bank hoort bij de markt.
--
-- Naast de CSV en niet erin, zoals `excluded`: de CSV is wat de generatie
-- opleverde, dit is een oordeel erna.

alter table question_banks
  add column if not exists standalone jsonb not null default '[]'::jsonb;
alter table question_banks
  add column if not exists overlay_labels jsonb not null default '{}'::jsonb;
