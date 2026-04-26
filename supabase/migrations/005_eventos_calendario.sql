-- ============================================================================
-- 005_eventos_calendario.sql — Eventos do mini-calendário do Painel
-- ============================================================================
-- Tabela leve, separada de "eventos" (cultos com presença).
-- Serve pra anotações rápidas no calendário: aniversários da igreja,
-- reuniões internas, datas comemorativas, etc.
-- ============================================================================

create table if not exists eventos_calendario (
  id uuid primary key default uuid_generate_v4(),
  church_group_id uuid not null references church_groups(id) on delete cascade,
  church_id uuid references churches(id) on delete set null,
  titulo text not null,
  descricao text,
  data date not null,
  hora time,
  cor text default 'blue'
    check (cor in ('blue','green','red','amber','purple','orange','pink','gray')),
  created_by uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_evcal_group on eventos_calendario(church_group_id);
create index if not exists idx_evcal_data on eventos_calendario(data);
create index if not exists idx_evcal_church on eventos_calendario(church_id);

create trigger trg_evcal_updated before update on eventos_calendario
  for each row execute function set_updated_at();

create trigger audit_evcal after insert or update or delete on eventos_calendario
  for each row execute function audit_trigger_func();

alter table eventos_calendario enable row level security;

create policy "evcal_select" on eventos_calendario for select
  using (is_master() or church_group_id = auth_group_id());

create policy "evcal_modify" on eventos_calendario for all
  using (
    can_write()
    and (is_master() or church_group_id = auth_group_id())
  )
  with check (
    can_write()
    and (is_master() or church_group_id = auth_group_id())
  );

-- ============================================================================
-- FIM 005_eventos_calendario.sql
-- ============================================================================
