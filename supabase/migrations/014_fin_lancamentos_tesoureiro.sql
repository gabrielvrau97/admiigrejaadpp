-- ============================================================================
-- 014_fin_lancamentos_tesoureiro.sql — Vincula lançamentos ao tesoureiro
-- ============================================================================

alter table fin_lancamentos
  add column if not exists tesoureiro_id uuid references fin_tesoureiros(id) on delete set null;

create index if not exists fin_lancamentos_tesoureiro_idx on fin_lancamentos(tesoureiro_id);

-- ============================================================================
-- FIM 014_fin_lancamentos_tesoureiro.sql
-- ============================================================================
