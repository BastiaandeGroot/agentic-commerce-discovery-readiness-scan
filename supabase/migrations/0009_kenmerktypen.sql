-- Welke waarde elk kenmerk van een bank in een catalogus hoort te dragen.
--
-- De bank noemt een kenmerk alleen bij naam (`hittebestendigheid_max_c`). Of daar
-- een getal in °C in hoort of een ja/nee, stond nergens, en dan kan het
-- koppelscherm een kenmerk op een kolom leggen die het nooit kan dragen. Een
-- losse stap per markt typeert de kenmerken; een beheerder loopt de tabel na en
-- bevestigt hem. Pas daarna ziet een merchant de typen.
--
-- Naast de CSV en niet erin, om dezelfde reden als `excluded`: de CSV is wat de
-- generatie opleverde, en dit is een stap erna die opnieuw gedaan kan worden
-- zonder de bank te herschrijven.
--
-- Vorm: { version, status: 'review' | 'confirmed', typedAt, confirmedAt?,
--         attributes, shapes: { <kenmerk>: { kind, unit?, values? } }, errors, cents? }

alter table question_banks
  add column if not exists attribute_types jsonb;
