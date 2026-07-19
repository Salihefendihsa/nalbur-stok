-- Soft delete support: add deleted_at to all user-manageable entities.
-- List/detail queries should filter WHERE deleted_at IS NULL; "delete" sets
-- deleted_at = now(); "restore" sets it back to NULL.

alter table categories add column if not exists deleted_at timestamptz;
alter table suppliers add column if not exists deleted_at timestamptz;
alter table products add column if not exists deleted_at timestamptz;
alter table stock_movements add column if not exists deleted_at timestamptz;
alter table sales add column if not exists deleted_at timestamptz;
alter table purchases add column if not exists deleted_at timestamptz;

create index if not exists idx_categories_deleted_at on categories(deleted_at);
create index if not exists idx_suppliers_deleted_at on suppliers(deleted_at);
create index if not exists idx_products_deleted_at on products(deleted_at);
create index if not exists idx_stock_movements_deleted_at on stock_movements(deleted_at);
create index if not exists idx_sales_deleted_at on sales(deleted_at);
create index if not exists idx_purchases_deleted_at on purchases(deleted_at);
