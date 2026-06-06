-- ============================================================================
-- 013_fin_tesoureiros.sql — Tesoureiros por grupo de igrejas
-- ============================================================================

create table if not exists fin_tesoureiros (
  id              uuid primary key default gen_random_uuid(),
  church_group_id uuid not null references church_groups(id) on delete cascade,
  nome            text not null,
  ativo           boolean not null default true,
  ordem           integer not null default 0,
  created_at      timestamptz not null default now()
);

create index if not exists fin_tesoureiros_group_idx on fin_tesoureiros(church_group_id);

alter table fin_tesoureiros enable row level security;

create policy "fin_tesoureiros_select" on fin_tesoureiros
  for select using (
    exists (
      select 1 from app_users
      where id = auth.uid()
        and church_group_id = fin_tesoureiros.church_group_id
    )
  );

create policy "fin_tesoureiros_insert" on fin_tesoureiros
  for insert with check (
    exists (
      select 1 from app_users
      where id = auth.uid()
        and church_group_id = fin_tesoureiros.church_group_id
        and role = 'master'
    )
  );

create policy "fin_tesoureiros_update" on fin_tesoureiros
  for update using (
    exists (
      select 1 from app_users
      where id = auth.uid()
        and church_group_id = fin_tesoureiros.church_group_id
        and role = 'master'
    )
  );

create policy "fin_tesoureiros_delete" on fin_tesoureiros
  for delete using (
    exists (
      select 1 from app_users
      where id = auth.uid()
        and church_group_id = fin_tesoureiros.church_group_id
        and role = 'master'
    )
  );

-- ============================================================================
-- FIM 013_fin_tesoureiros.sql
-- ============================================================================
