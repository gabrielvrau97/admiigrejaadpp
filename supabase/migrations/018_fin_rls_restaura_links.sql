-- ============================================================================
-- 018_fin_rls_restaura_links.sql
-- Restaura policies de fin_recibos e fin_tesoureiros para o padrão que
-- funcionava antes (exists em app_users, não auth_group_id()).
-- Também corrige fin_lancamentos para garantir que os joins do extrato
-- e da tesouraria funcionem corretamente.
-- ============================================================================

-- ============================================================================
-- 1) fin_lancamentos — joins com members, churches, app_users, fin_categorias
--    precisam funcionar para master e admin_financeiro
-- ============================================================================
drop policy if exists "fin_lanc_select" on fin_lancamentos;
create policy "fin_lanc_select" on fin_lancamentos for select
  using (
    exists (
      select 1 from app_users
      where id = auth.uid()
        and church_group_id = fin_lancamentos.church_group_id
        and role in ('master', 'admin_financeiro')
    )
    or
    (
      auth_role() = 'tesoureiro'
      and created_by = auth.uid()
      and church_group_id = auth_group_id()
    )
  );

drop policy if exists "fin_lanc_insert" on fin_lancamentos;
create policy "fin_lanc_insert" on fin_lancamentos for insert
  with check (
    exists (
      select 1 from app_users
      where id = auth.uid()
        and church_group_id = fin_lancamentos.church_group_id
        and role in ('master', 'admin_financeiro', 'tesoureiro')
    )
  );

drop policy if exists "fin_lanc_modify" on fin_lancamentos;
create policy "fin_lanc_modify" on fin_lancamentos for update
  using (
    exists (
      select 1 from app_users
      where id = auth.uid()
        and church_group_id = fin_lancamentos.church_group_id
        and role in ('master', 'admin_financeiro')
    )
    or
    (auth_role() = 'tesoureiro' and created_by = auth.uid() and church_group_id = auth_group_id())
  );

drop policy if exists "fin_lanc_delete" on fin_lancamentos;
create policy "fin_lanc_delete" on fin_lancamentos for delete
  using (
    exists (
      select 1 from app_users
      where id = auth.uid()
        and church_group_id = fin_lancamentos.church_group_id
        and role in ('master', 'admin_financeiro')
    )
    or
    (auth_role() = 'tesoureiro' and created_by = auth.uid() and church_group_id = auth_group_id())
  );

-- ============================================================================
-- 2) fin_categorias
-- ============================================================================
drop policy if exists "fin_cat_select" on fin_categorias;
create policy "fin_cat_select" on fin_categorias for select
  using (
    exists (
      select 1 from app_users
      where id = auth.uid()
        and church_group_id = fin_categorias.church_group_id
        and role in ('master', 'admin_financeiro', 'admin_secretaria', 'tesoureiro')
    )
  );

drop policy if exists "fin_cat_modify" on fin_categorias;
create policy "fin_cat_modify" on fin_categorias for all
  using (
    exists (
      select 1 from app_users
      where id = auth.uid()
        and church_group_id = fin_categorias.church_group_id
        and role = 'master'
    )
  )
  with check (
    exists (
      select 1 from app_users
      where id = auth.uid()
        and church_group_id = fin_categorias.church_group_id
        and role = 'master'
    )
  );

-- ============================================================================
-- 3) fin_fornecedores
-- ============================================================================
drop policy if exists "fin_forn_select" on fin_fornecedores;
create policy "fin_forn_select" on fin_fornecedores for select
  using (
    exists (
      select 1 from app_users
      where id = auth.uid()
        and church_group_id = fin_fornecedores.church_group_id
        and role in ('master', 'admin_financeiro', 'admin_secretaria', 'tesoureiro')
    )
  );

drop policy if exists "fin_forn_modify" on fin_fornecedores;
create policy "fin_forn_modify" on fin_fornecedores for all
  using (
    exists (
      select 1 from app_users
      where id = auth.uid()
        and church_group_id = fin_fornecedores.church_group_id
        and role = 'master'
    )
  )
  with check (
    exists (
      select 1 from app_users
      where id = auth.uid()
        and church_group_id = fin_fornecedores.church_group_id
        and role = 'master'
    )
  );

-- ============================================================================
-- 4) fin_recibos
-- ============================================================================
drop policy if exists "fin_recibos_select" on fin_recibos;
create policy "fin_recibos_select" on fin_recibos for select
  using (
    exists (
      select 1 from app_users
      where id = auth.uid()
        and church_group_id = fin_recibos.church_group_id
    )
  );

drop policy if exists "fin_recibos_insert" on fin_recibos;
create policy "fin_recibos_insert" on fin_recibos for insert
  with check (
    exists (
      select 1 from app_users
      where id = auth.uid()
        and church_group_id = fin_recibos.church_group_id
        and role in ('master', 'admin_financeiro', 'admin_secretaria', 'tesoureiro')
    )
  );

drop policy if exists "fin_recibos_update" on fin_recibos;
create policy "fin_recibos_update" on fin_recibos for update
  using (
    exists (
      select 1 from app_users
      where id = auth.uid()
        and church_group_id = fin_recibos.church_group_id
        and role in ('master', 'admin_financeiro', 'admin_secretaria')
    )
  );

-- ============================================================================
-- 5) fin_tesoureiros
-- ============================================================================
drop policy if exists "fin_tesoureiros_select" on fin_tesoureiros;
create policy "fin_tesoureiros_select" on fin_tesoureiros for select
  using (
    exists (
      select 1 from app_users
      where id = auth.uid()
        and church_group_id = fin_tesoureiros.church_group_id
    )
  );

drop policy if exists "fin_tesoureiros_insert" on fin_tesoureiros;
create policy "fin_tesoureiros_insert" on fin_tesoureiros for insert
  with check (
    exists (
      select 1 from app_users
      where id = auth.uid()
        and church_group_id = fin_tesoureiros.church_group_id
        and role = 'master'
    )
  );

drop policy if exists "fin_tesoureiros_update" on fin_tesoureiros;
create policy "fin_tesoureiros_update" on fin_tesoureiros for update
  using (
    exists (
      select 1 from app_users
      where id = auth.uid()
        and church_group_id = fin_tesoureiros.church_group_id
        and role = 'master'
    )
  );

drop policy if exists "fin_tesoureiros_delete" on fin_tesoureiros;
create policy "fin_tesoureiros_delete" on fin_tesoureiros for delete
  using (
    exists (
      select 1 from app_users
      where id = auth.uid()
        and church_group_id = fin_tesoureiros.church_group_id
        and role = 'master'
    )
  );

-- ============================================================================
-- FIM 018_fin_rls_restaura_links.sql
-- ============================================================================
