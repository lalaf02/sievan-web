drop policy if exists curator_read_profiles on public.profiles;
drop policy if exists profile_self_read on public.profiles;
create policy profiles_read_authenticated on public.profiles
for select to authenticated
using (user_id=(select auth.uid()) or private.is_curator());

do $$
declare r record;
declare idx_name text;
begin
  for r in
    select c.conrelid::regclass as tbl,
           c.conname,
           array_agg(a.attname order by u.ord) as cols
    from pg_constraint c
    join lateral unnest(c.conkey) with ordinality u(attnum, ord) on true
    join pg_attribute a on a.attrelid=c.conrelid and a.attnum=u.attnum
    join pg_class cl on cl.oid=c.conrelid
    join pg_namespace n on n.oid=cl.relnamespace
    where c.contype='f' and n.nspname='public'
      and not exists (
        select 1
        from pg_index i
        where i.indrelid=c.conrelid
          and i.indisvalid
          and (i.indkey::smallint[])[0:cardinality(c.conkey)-1] = c.conkey
      )
    group by c.conrelid, c.conname
  loop
    idx_name := left('fkidx_' || replace(r.tbl::text,'public.','') || '_' || array_to_string(r.cols,'_'), 60);
    execute format('create index if not exists %I on %s (%s)', idx_name, r.tbl, array_to_string(array(select quote_ident(x) from unnest(r.cols) x), ','));
  end loop;
end $$;
