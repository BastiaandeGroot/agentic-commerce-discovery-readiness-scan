-- Welke koppelingen een voorstel van een model zijn, bewaard naast de koppeling.
--
-- Een voorstel is nooit een koppeling: het staat in de lijst tot de merchant het
-- laat staan of wijzigt. Tot nu toe wist alleen het scherm welke koppelingen een
-- voorstel waren. Ze werden meteen als gewone koppeling bewaard, en bij het
-- volgende bezoek was niet meer te zien dat de merchant er nooit naar had
-- gekeken. Een koppeling van een zwakker model bleef dan voorgoed staan.
--
-- Zonder deze migratie blijft alles werken; alleen de herkomst gaat niet mee, en
-- een voorstel wordt na herladen weer een gewone koppeling.
--
-- Alleen namen: kenmerksleutel en kolomnaam.

alter table merchant_bank_settings
  -- Kenmerksleutel -> de kolom die een model aanwees en die de merchant nog niet
  -- aanraakte.
  add column if not exists proposed jsonb not null default '{}'::jsonb,

  -- Onder welke versie van model, opdracht en zeef die voorstellen gedaan zijn
  -- (PROPOSAL_VERSION in src/semantic/prompt.ts). Is die ouder dan de huidige,
  -- dan worden ze één keer opnieuw beoordeeld.
  add column if not exists proposal_version text;
