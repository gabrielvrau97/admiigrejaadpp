-- ============================================================================
-- 012_fin_recibos.sql — Registro de recibos financeiros
-- ============================================================================
-- Tabela leve: apenas referência ao lançamento + número sequencial + status.
-- O conteúdo do recibo é sempre gerado dinamicamente a partir do lançamento.
-- ============================================================================

create sequence if not exists fin_recibo_seq start 1;

create table if not exists fin_recibos (
  id              uuid primary key default gen_random_uuid(),
  numero          text not null,                          -- ex: REC-2026-0001
  lancamento_id   uuid not null references fin_lancamentos(id) on delete cascade,
  church_group_id uuid not null references church_groups(id) on delete cascade,
  emitido_por     uuid references auth.users(id),
  emitido_em      timestamptz not null default now(),
  anulado         boolean not null default false,
  created_at      timestamptz not null default now()
);

create index if not exists fin_recibos_lancamento_idx on fin_recibos(lancamento_id);
create index if not exists fin_recibos_group_idx     on fin_recibos(church_group_id);

-- Número sequencial por grupo
create or replace function gen_fin_recibo_numero(p_group_id uuid)
returns text as $$
declare
  v_seq bigint;
  v_ano text;
begin
  v_ano := to_char(now(), 'YYYY');
  select coalesce(max(
    (regexp_match(numero, '\d+$'))[1]::bigint
  ), 0) + 1
  into v_seq
  from fin_recibos
  where church_group_id = p_group_id
    and numero like 'REC-' || v_ano || '-%';

  return 'REC-' || v_ano || '-' || lpad(v_seq::text, 4, '0');
end;
$$ language plpgsql security definer;

-- RLS
alter table fin_recibos enable row level security;

create policy "fin_recibos_select" on fin_recibos
  for select using (
    exists (
      select 1 from app_users
      where id = auth.uid()
        and church_group_id = fin_recibos.church_group_id
    )
  );

create policy "fin_recibos_insert" on fin_recibos
  for insert with check (
    exists (
      select 1 from app_users
      where id = auth.uid()
        and church_group_id = fin_recibos.church_group_id
        and role in ('master','admin_financeiro')
    )
  );

create policy "fin_recibos_update" on fin_recibos
  for update using (
    exists (
      select 1 from app_users
      where id = auth.uid()
        and church_group_id = fin_recibos.church_group_id
        and role in ('master','admin_financeiro')
    )
  );

-- ============================================================================
-- FIM 012_fin_recibos.sql
-- ============================================================================
