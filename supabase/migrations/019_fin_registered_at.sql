-- Migration 019: adiciona registered_at em fin_lancamentos
-- registered_at = momento exato em que o lançamento foi gravado no sistema
-- (diferente de data_lancamento, que é a data do fluxo financeiro)

alter table fin_lancamentos
  add column if not exists registered_at timestamptz not null default now();

-- índice para filtrar lançamentos por dia de registro (usado na tesouraria)
create index if not exists idx_fin_lancamentos_registered_at
  on fin_lancamentos (church_group_id, (registered_at::date));

-- popula retroativamente usando created_at nos registros existentes
update fin_lancamentos
  set registered_at = created_at
  where registered_at = now(); -- apenas os que acabaram de receber o default (não existentes antes)

-- Para registros já existentes: registered_at fica = created_at
update fin_lancamentos
  set registered_at = created_at;
