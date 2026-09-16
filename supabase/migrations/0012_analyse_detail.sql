-- Een bewaarde analyse bijwerken zonder de catalogus opnieuw in te lezen.
--
-- Naast de snapshot bewaart de app nu twee dingen: de vragensets zoals ze voor
-- de scan zijn samengesteld, en per product welke vraag in welke toestand stond
-- (zie src/engine/rescore.ts). Daarmee kan een merchant na de scan een vraag
-- uitzetten en ziet hij zijn rapport meteen herberekend.
--
-- Een eigen kolom en niet in `snapshot`: het is een paar honderd kilobyte per
-- analyse, en het overzicht van alle analyses heeft het niet nodig. Het wordt
-- pas opgehaald als er één analyse open gaat.
--
-- Geen productdata: geen sleutel, geen titel, geen waarde. Per product een rij
-- toestanden tegen vraag-id's en de veldnamen die een antwoord misten. Los van
-- de catalogus is een rij niet naar een product terug te voeren.
--
-- Opnieuw draaien mag.

alter table scan_snapshots add column if not exists detail jsonb;
