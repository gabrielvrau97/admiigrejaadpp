-- ============================================================================
-- 009_financeiro.sql — Módulo Financeiro
-- Site ADM ADP / Igreja Digital
-- ============================================================================
-- DEPENDE DE: 001_schema.sql, 002_rls.sql, 008_papeis_simplificados.sql
-- ============================================================================

-- ============================================================================
-- 1) CATEGORIAS FINANCEIRAS
-- ============================================================================

create table fin_categorias (
  id uuid primary key default uuid_generate_v4(),
  church_group_id uuid not null references church_groups(id) on delete cascade,
  tipo text not null check (tipo in ('entrada', 'saida')),
  nome text not null,
  cor text not null default '#6b7280',
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_fin_categorias_group on fin_categorias(church_group_id);
create index idx_fin_categorias_tipo on fin_categorias(tipo);

create trigger trg_fin_categorias_updated_at
  before update on fin_categorias
  for each row execute function update_updated_at();

-- ============================================================================
-- 2) FORNECEDORES / BENEFICIÁRIOS
-- ============================================================================

create table fin_fornecedores (
  id uuid primary key default uuid_generate_v4(),
  church_group_id uuid not null references church_groups(id) on delete cascade,
  nome text not null,
  documento text,
  contato text,
  observacao text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_fin_fornecedores_group on fin_fornecedores(church_group_id);

create trigger trg_fin_fornecedores_updated_at
  before update on fin_fornecedores
  for each row execute function update_updated_at();

-- ============================================================================
-- 3) LANÇAMENTOS FINANCEIROS
-- ============================================================================

create table fin_lancamentos (
  id uuid primary key default uuid_generate_v4(),
  church_group_id uuid not null references church_groups(id) on delete cascade,
  church_id uuid not null references churches(id) on delete restrict,
  tipo text not null check (tipo in ('entrada', 'saida')),
  categoria_id uuid references fin_categorias(id) on delete set null,
  fornecedor_id uuid references fin_fornecedores(id) on delete set null,
  member_id uuid references members(id) on delete set null,
  member_nome_manual text,
  valor numeric(12,2) not null check (valor > 0),
  descricao text,
  referencia_culto text,
  data_lancamento date not null default current_date,
  origem text not null default 'manual' check (origem in ('manual', 'importado')),
  periodo_referencia text,
  created_by uuid not null references app_users(id) on delete restrict,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_fin_lancamentos_group on fin_lancamentos(church_group_id);
create index idx_fin_lancamentos_church on fin_lancamentos(church_id);
create index idx_fin_lancamentos_data on fin_lancamentos(data_lancamento);
create index idx_fin_lancamentos_tipo on fin_lancamentos(tipo);
create index idx_fin_lancamentos_created_by on fin_lancamentos(created_by);
create index idx_fin_lancamentos_member on fin_lancamentos(member_id);

create trigger trg_fin_lancamentos_updated_at
  before update on fin_lancamentos
  for each row execute function update_updated_at();

-- ============================================================================
-- 4) RLS
-- ============================================================================

alter table fin_categorias enable row level security;
alter table fin_fornecedores enable row level security;
alter table fin_lancamentos enable row level security;

-- Categorias — leitura: master + admin_financeiro; escrita: master
create policy "fin_cat_select" on fin_categorias for select
  using (
    auth_role() in ('master', 'admin_financeiro')
    and church_group_id = auth_group_id()
  );

create policy "fin_cat_modify" on fin_categorias for all
  using (auth_role() = 'master' and church_group_id = auth_group_id())
  with check (auth_role() = 'master' and church_group_id = auth_group_id());

-- Fornecedores — leitura: master + admin_financeiro; escrita: master
create policy "fin_forn_select" on fin_fornecedores for select
  using (
    auth_role() in ('master', 'admin_financeiro')
    and church_group_id = auth_group_id()
  );

create policy "fin_forn_modify" on fin_fornecedores for all
  using (auth_role() = 'master' and church_group_id = auth_group_id())
  with check (auth_role() = 'master' and church_group_id = auth_group_id());

-- Lançamentos — inserção: master + admin_financeiro
create policy "fin_lanc_insert" on fin_lancamentos for insert
  with check (
    auth_role() in ('master', 'admin_financeiro')
    and church_group_id = auth_group_id()
  );

-- Lançamentos — leitura: master vê tudo; admin_financeiro vê só os próprios
create policy "fin_lanc_select" on fin_lancamentos for select
  using (
    (auth_role() = 'master' and church_group_id = auth_group_id())
    or (auth_role() = 'admin_financeiro' and created_by = auth.uid())
  );

-- Lançamentos — update/delete: master vê tudo; admin_financeiro só os próprios
create policy "fin_lanc_modify" on fin_lancamentos for update
  using (
    (auth_role() = 'master' and church_group_id = auth_group_id())
    or (auth_role() = 'admin_financeiro' and created_by = auth.uid())
  );

create policy "fin_lanc_delete" on fin_lancamentos for delete
  using (
    (auth_role() = 'master' and church_group_id = auth_group_id())
    or (auth_role() = 'admin_financeiro' and created_by = auth.uid())
  );

-- ============================================================================
-- 5) AUDITORIA
-- ============================================================================

create trigger audit_fin_categorias after insert or update or delete on fin_categorias
  for each row execute function audit_trigger_func();

create trigger audit_fin_fornecedores after insert or update or delete on fin_fornecedores
  for each row execute function audit_trigger_func();

create trigger audit_fin_lancamentos after insert or update or delete on fin_lancamentos
  for each row execute function audit_trigger_func();

-- ============================================================================
-- 6) CATEGORIAS PADRÃO
-- Inserir após criar o grupo via seed — chamado pelo app na primeira vez que
-- o master acessa /financeiro/configuracoes (ver fin_categorias.ts)
-- ============================================================================

-- Função para popular defaults ao receber um group_id
create or replace function seed_fin_categorias(p_group_id uuid)
returns void as $$
begin
  -- Entradas
  insert into fin_categorias (church_group_id, tipo, nome, cor) values
    (p_group_id, 'entrada', 'Dízimo',       '#22c55e'),
    (p_group_id, 'entrada', 'Oferta Geral', '#16a34a'),
    (p_group_id, 'entrada', 'Campanha',     '#3b82f6'),
    (p_group_id, 'entrada', 'Outros',       '#6b7280')
  on conflict do nothing;

  -- Saídas
  insert into fin_categorias (church_group_id, tipo, nome, cor) values
    (p_group_id, 'saida', 'Ajuda Social',  '#f97316'),
    (p_group_id, 'saida', 'Combustível',   '#eab308'),
    (p_group_id, 'saida', 'Conta Fixa',    '#ef4444'),
    (p_group_id, 'saida', 'Material',      '#8b5cf6'),
    (p_group_id, 'saida', 'Outros',        '#6b7280')
  on conflict do nothing;
end;
$$ language plpgsql security definer;

-- ============================================================================
-- FIM 009_financeiro.sql
-- ============================================================================
