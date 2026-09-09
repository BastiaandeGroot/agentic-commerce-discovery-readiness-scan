-- Wie zich registreert krijgt meteen een account.
--
-- Zonder dit heeft een nieuwe gebruiker wél een login maar geen account, en
-- verwijst alles wat hij bewaart naar iets dat niet bestaat. Dat bleek pas toen
-- de eerste aanvraag in de wachtrij gezet moest worden.
--
-- In de database en niet in de app, om twee redenen. Het geldt dan ook voor een
-- tweede manier van registreren die er later bij komt — een uitnodiging, een
-- koppeling met Google — en het kan niet half mislukken: de gebruiker en zijn
-- account ontstaan in dezelfde transactie of geen van beide.

create or replace function public.account_bij_nieuwe_gebruiker()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  nieuw_account uuid;
begin
  -- De naam is voorlopig zijn e-mailadres. Een merchant die zijn bedrijfsnaam
  -- invult overschrijft hem later; een lege naam zou de accountwissel leeg laten.
  insert into public.accounts (name)
  values (coalesce(new.email, 'account'))
  returning id into nieuw_account;

  insert into public.account_members (account_id, user_id, role)
  values (nieuw_account, new.id, 'owner');

  return new;
end;
$$;

drop trigger if exists account_bij_registratie on auth.users;
create trigger account_bij_registratie
  after insert on auth.users
  for each row execute function public.account_bij_nieuwe_gebruiker();

-- Bestaande gebruikers zonder account alsnog er een geven. Idempotent: wie er al
-- een heeft wordt overgeslagen, dus dit mag opnieuw gedraaid worden.
do $$
declare
  gebruiker record;
  nieuw_account uuid;
begin
  for gebruiker in
    select u.id, u.email from auth.users u
    where not exists (select 1 from public.account_members m where m.user_id = u.id)
  loop
    insert into public.accounts (name) values (coalesce(gebruiker.email, 'account'))
    returning id into nieuw_account;
    insert into public.account_members (account_id, user_id, role)
    values (nieuw_account, gebruiker.id, 'owner');
  end loop;
end;
$$;
