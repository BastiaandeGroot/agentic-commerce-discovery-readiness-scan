-- De koppeling van een account draagt het adres van de webshop waar hij bij hoort.
--
-- Een koppeling werd onthouden per account en per markt. Een collega die zich
-- registreert krijgt een eigen account, scant dezelfde webshop en begint dan
-- opnieuw met koppelen. Met het adres erbij kan de app de koppelingen van
-- dezelfde webshop terugvinden, over accounts heen.
--
-- Elk account houdt zijn eigen rij: niemand overschrijft het werk van een ander.
-- Lezen over accounts heen doet alleen de server (`/api/shop-mapping`), en die
-- geeft van een ander account alleen koppelingen terug naar kolommen die de
-- vrager zelf al noemt. Wie de catalogus niet heeft, leert er dus geen
-- kolomnamen uit. De regels voor rijbeveiliging hieronder veranderen niet.
--
-- Het adres is de hostnaam zonder protocol en zonder `www.`, in kleine letters.
--
-- Zonder deze migratie blijft alles werken; alleen het delen per webshop niet.

alter table merchant_bank_settings
  add column if not exists site text;

create index if not exists merchant_bank_settings_site
  on merchant_bank_settings (site, updated_at desc)
  where site is not null;
