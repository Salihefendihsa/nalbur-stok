-- SUPERSEDED by supabase/migrations/0002_authenticated_rls.sql — do not re-run this file.
-- Kept only for history. Development-only permissive policies: allow the anon role full access.
-- This app has no authentication yet; tighten these before going to production.

alter table categories enable row level security;
alter table suppliers enable row level security;
alter table products enable row level security;
alter table stock_movements enable row level security;
alter table sales enable row level security;
alter table sale_items enable row level security;
alter table purchases enable row level security;
alter table purchase_items enable row level security;

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
    execute format(
      'create policy "anon_all_%1$s" on %1$s for all to anon using (true) with check (true)',
      t
    );
  end loop;
end $$;
