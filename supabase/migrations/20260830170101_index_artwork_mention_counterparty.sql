-- The one covering index the seven-table core missed: artwork_mentions.counterparty_person_id,
-- the buyer or dealer a sheet names. Caught by the performance advisor after the cutover.
-- Every other foreign key on the new tables already had one.
create index on public.artwork_mentions (counterparty_person_id);
