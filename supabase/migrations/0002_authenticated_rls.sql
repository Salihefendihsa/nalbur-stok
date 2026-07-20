-- Replaces the dev-only "anon full access" policies now that Supabase Auth is in place.
-- Drops the anon_all_* policies from supabase/dev_policies.sql and requires an
-- authenticated session for all operations on every table.

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'categories', 'suppliers', 'products', 'stock_movements',
      'sales', 'sale_items', 'purchases', 'purchase_items'
    ])
  loop
    execute format('drop policy if exists "anon_all_%1$s" on %1$s', t);
    execute format('drop policy if exists "authenticated_all_%1$s" on %1$s', t);
    execute format(
      'create policy "authenticated_all_%1$s" on %1$s for all to authenticated using (true) with check (true)',
      t
    );
  end loop;
end $$;
