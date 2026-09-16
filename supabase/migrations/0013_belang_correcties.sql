-- Het belang van een vraag corrigeren, naast de bank.
--
-- Kritiek is de poort voor basisgeschikt, en de eerste echte bank maakte er te
-- veel vragen kritiek: de maat was "voorkomt de fout die de koper niet kan
-- terugdraaien", en in een markt waar op maat geknipt wordt geldt dat voor bijna
-- alles. De toets is nu scherper (src/questions/critical.ts), en een beheerder
-- kan het belang per vraag corrigeren.
--
-- Naast de CSV en niet erin, om dezelfde reden als `excluded`: de CSV is wat de
-- generatie opleverde, en dit is een oordeel erna. Opnieuw genereren zou nieuwe
-- vraag-id's geven, en daar hangt het werk van elke merchant aan.
--
-- Vorm: { "<vraag-id>": "critical" | "high" | "medium" | "low",
--         "<overlay-id>/<vraag-id>": ... }   -- de herweging binnen één categorie
--
-- Opnieuw draaien mag.

alter table question_banks
  add column if not exists importance_corrections jsonb not null default '{}'::jsonb;
