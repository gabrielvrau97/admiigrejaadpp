-- ============================================================================
-- 010_fin_acesso_rapido.sql — Acesso rápido em categorias financeiras
-- ============================================================================
-- Adiciona flag acesso_rapido em fin_categorias.
-- Categorias de entrada com acesso_rapido=true aparecem como botões fixos
-- na tela de tesouraria. Defaults: Dízimo, Oferta Geral e Outros marcados.
-- ============================================================================

alter table fin_categorias
  add column if not exists acesso_rapido boolean not null default false;

-- Marca os defaults de entrada como acesso rápido
update fin_categorias
  set acesso_rapido = true
  where tipo = 'entrada'
    and nome in ('Dízimo', 'Oferta Geral', 'Outros');

-- Atualiza a função seed pra já criar com acesso_rapido=true nos defaults
create or replace function seed_fin_categorias(p_group_id uuid)
returns void as $$
begin
  insert into fin_categorias (church_group_id, tipo, nome, cor, acesso_rapido) values
    (p_group_id, 'entrada', 'Dízimo',       '#22c55e', true),
    (p_group_id, 'entrada', 'Oferta Geral', '#16a34a', true),
    (p_group_id, 'entrada', 'Campanha',     '#3b82f6', false),
    (p_group_id, 'entrada', 'Outros',       '#6b7280', true)
  on conflict do nothing;

  insert into fin_categorias (church_group_id, tipo, nome, cor, acesso_rapido) values
    (p_group_id, 'saida', 'Ajuda Social',  '#f97316', false),
    (p_group_id, 'saida', 'Combustível',   '#eab308', false),
    (p_group_id, 'saida', 'Conta Fixa',    '#ef4444', false),
    (p_group_id, 'saida', 'Material',      '#8b5cf6', false),
    (p_group_id, 'saida', 'Outros',        '#6b7280', false)
  on conflict do nothing;
end;
$$ language plpgsql security definer;

-- ============================================================================
-- FIM 010_fin_acesso_rapido.sql
-- ============================================================================
