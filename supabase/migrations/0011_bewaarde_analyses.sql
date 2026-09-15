-- Bewaarde analyses in het account.
--
-- `scan_snapshots` stond er sinds 0001 maar is nooit gebruikt: de app bewaarde
-- scans alleen in de browser, en de kolommen passen bij een vorm van toen (een
-- uitkomst per protocol, een feednaam). Een ingelogde merchant hoort zijn eerdere
-- analyses terug te zien zonder alle stappen opnieuw te doorlopen, ook op een
-- ander apparaat.
--
-- Wat er in gaat is de snapshot uit src/engine/snapshot.ts: tellingen,
-- categorienamen, veldnamen en de teksten van onbeantwoorde vragen. Geen
-- productrij, geen waarde, geen prijs, geen bronbestand. De catalogus blijft op
-- het apparaat van de merchant.
--
-- De oude kolommen blijven staan maar zijn niet meer verplicht; de hele snapshot
-- staat in `snapshot`, met een sleutel per scan zodat dezelfde scan twee keer
-- bewaren hem overschrijft in plaats van verdubbelt.

alter table scan_snapshots alter column feed_name drop not null;
alter table scan_snapshots alter column protocols drop not null;

alter table scan_snapshots add column if not exists snapshot_key text;
alter table scan_snapshots add column if not exists snapshot jsonb;

create unique index if not exists scan_snapshots_account_key_idx
  on scan_snapshots (account_id, snapshot_key);

-- Bijwerken is nodig voor opnieuw bewaren van dezelfde scan.
drop policy if exists snapshots_update on scan_snapshots;
create policy snapshots_update on scan_snapshots
  for update using (
    exists (select 1 from account_members m
            where m.account_id = scan_snapshots.account_id and m.user_id = auth.uid())
  );
