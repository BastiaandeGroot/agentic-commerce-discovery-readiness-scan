-- De klantvragen uit de klantenservice van de aanvrager reizen mee met zijn
-- bankaanvraag.
--
-- Wat kopers zijn klantenservice mailen, als lijst van {question, theme?,
-- count?}: geen antwoorden, geen e-mailadressen, geen productdata. De generatie
-- gebruikt ze als aanwijzing bij het samenvoegen en het nalopen: ze mogen een
-- onderwerp aandragen dat de oogst mist, maar tellen niet als panelsite en
-- verhogen geen dekking. Een onderwerp dat alleen hieruit komt staat op dekking
-- 0, met bron "klantenservice aanvrager", en kan niet kritiek zijn. Een bank
-- hoort bij de markt; de mail van één winkel legt de meetlat niet.
--
-- Zonder deze migratie blijft alles werken; de aanvraag gaat dan zonder de
-- klantvragen. De regels voor rijbeveiliging veranderen niet.

alter table bank_requests
  add column if not exists support_questions jsonb not null default '[]'::jsonb;
