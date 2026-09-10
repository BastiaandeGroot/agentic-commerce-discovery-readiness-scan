-- De helft van de prijs, in ruil voor geduld.
--
-- De batch-API van Anthropic rekent asynchrone verzoeken tegen 50% af: zelfde
-- model, zelfde prompt, zelfde antwoord — je levert alleen snelheid in. Dat is
-- precies wat hier niet nodig is: we beloven de merchant één tot twee werkdagen
-- en een generatie duurt toch al uren.
--
-- Wat de fase daardoor moet kunnen: hem indienen in de ene beurt en het antwoord
-- ophalen in een volgende, misschien op een ander proces. Vandaar deze kolom.
-- Staat er een batch-id, dan wacht deze run op een uitkomst en hoeft er niets
-- opnieuw ingediend te worden.
alter table bank_runs add column if not exists batch_id text;

-- Wanneer hij is ingediend, zodat een batch die blijft hangen op te merken is.
-- De API belooft meestal binnen een uur en uiterlijk vierentwintig.
alter table bank_runs add column if not exists batch_at timestamptz;
