-- ============================================================================
-- 016_papel_tesoureiro.sql — Adiciona papel tesoureiro
-- ============================================================================
-- Papel com acesso restrito: só /financeiro/tesouraria + meu-perfil.
-- Não acessa dashboard analítico, extrato, configurações ou qualquer módulo
-- da secretaria.
-- ============================================================================

-- 1. Atualiza o CHECK constraint pra aceitar 'tesoureiro'
alter table app_users drop constraint if exists app_users_role_check;
alter table app_users add constraint app_users_role_check
  check (role in (
    'master',
    'admin_secretaria',
    'admin_financeiro',
    'tesoureiro',
    -- legados (não usar em novos cadastros):
    'admin',
    'secretaria',
    'visualizador'
  ));

-- 2. Tesoureiro pode ler categorias e fornecedores (necessário pro modal de lançamento)
drop policy if exists "fin_cat_select" on fin_categorias;
create policy "fin_cat_select" on fin_categorias for select
  using (
    auth_role() in ('master', 'admin_financeiro', 'admin_secretaria', 'tesoureiro')
    and church_group_id = auth_group_id()
  );

drop policy if exists "fin_forn_select" on fin_fornecedores;
create policy "fin_forn_select" on fin_fornecedores for select
  using (
    auth_role() in ('master', 'admin_financeiro', 'admin_secretaria', 'tesoureiro')
    and church_group_id = auth_group_id()
  );

-- 3. Lançamentos: tesoureiro pode criar e ver os próprios; admin_financeiro/master veem tudo
drop policy if exists "fin_lanc_select" on fin_lancamentos;
create policy "fin_lanc_select" on fin_lancamentos for select
  using (
    (auth_role() in ('master', 'admin_financeiro') and church_group_id = auth_group_id())
    or
    (auth_role() = 'tesoureiro' and created_by = auth.uid() and church_group_id = auth_group_id())
  );

drop policy if exists "fin_lanc_insert" on fin_lancamentos;
create policy "fin_lanc_insert" on fin_lancamentos for insert
  with check (
    auth_role() in ('master', 'admin_financeiro', 'tesoureiro')
    and church_group_id = auth_group_id()
  );

-- 4. Recibos: tesoureiro pode criar e ler (policies existentes já eram abertas para o grupo)
drop policy if exists "fin_recibos_select" on fin_recibos;
create policy "fin_recibos_select" on fin_recibos for select
  using (church_group_id = auth_group_id());

drop policy if exists "fin_recibos_insert" on fin_recibos;
create policy "fin_recibos_insert" on fin_recibos for insert
  with check (
    auth_role() in ('master', 'admin_financeiro', 'admin_secretaria', 'tesoureiro')
    and church_group_id = auth_group_id()
  );

-- 5. Tesoureiros: tesoureiro pode ler (pra se selecionar no modal)
drop policy if exists "fin_tesoureiros_select" on fin_tesoureiros;
create policy "fin_tesoureiros_select" on fin_tesoureiros for select
  using (church_group_id = auth_group_id());

-- ============================================================================
-- FIM 016_papel_tesoureiro.sql
-- ============================================================================
