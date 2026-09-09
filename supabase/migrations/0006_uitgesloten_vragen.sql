-- Vragen die de beheerder bij het vrijgeven overslaat.
--
-- Terugdraaibaar en zichtbaar: de vraag blijft in de bank staan, hij telt alleen
-- niet mee. Hem uit de CSV knippen zou de herkomst wegnemen — dan is later niet
-- meer na te gaan dat hij er ooit was en waarom hij eruit ging.

alter table question_banks
  add column if not exists excluded jsonb not null default '[]'::jsonb;
