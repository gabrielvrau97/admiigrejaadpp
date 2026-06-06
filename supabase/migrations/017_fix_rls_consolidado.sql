-- ============================================================================
-- 017_fix_rls_consolidado.sql
-- Consolida e corrige TODAS as políticas RLS do módulo financeiro.
-- Roda isso se as migrations 015 e 016 ainda não foram aplicadas,
-- ou se o comportamento estiver errado.
-- É seguro rodar mesmo se 015/016 já foram: usa DROP IF EXISTS antes de recriar.
-- ============================================================================

-- ============================================================================
-- 1) CHECK CONSTRAINT — aceita tesoureiro
-- ============================================================================
alter table app_users drop constraint if exists app_users_role_check;
alter table app_users add constraint app_users_role_check
  check (role in (
    'master', 'admin_secretaria', 'admin_financeiro', 'tesoureiro',
    'admin', 'secretaria', 'visualizador'
  ));

-- ============================================================================
-- 2) fin_categorias
-- SELECT: master, admin_financeiro, admin_secretaria, tesoureiro
-- WRITE:  master only
-- ============================================================================
drop policy if exists "fin_cat_select" on fin_categorias;
create policy "fin_cat_select" on fin_categorias for select
  using (
    auth_role() in ('master', 'admin_financeiro', 'admin_secretaria', 'tesoureiro')
    and church_group_id = auth_group_id()
  );

-- fin_cat_modify já existe e está correto (master only) — não precisa recriar

-- ============================================================================
-- 3) fin_fornecedores
-- SELECT: master, admin_financeiro, admin_secretaria, tesoureiro
-- WRITE:  master only
-- ============================================================================
drop policy if exists "fin_forn_select" on fin_fornecedores;
create policy "fin_forn_select" on fin_fornecedores for select
  using (
    auth_role() in ('master', 'admin_financeiro', 'admin_secretaria', 'tesoureiro')
    and church_group_id = auth_group_id()
  );

-- ============================================================================
-- 4) fin_lancamentos
-- SELECT: master e admin_financeiro veem tudo do grupo
--         tesoureiro vê só os próprios (created_by = auth.uid())
-- INSERT: master, admin_financeiro, tesoureiro
-- UPDATE/DELETE: master vê tudo; admin_financeiro/tesoureiro só os próprios
-- ============================================================================
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

drop policy if exists "fin_lanc_modify" on fin_lancamentos;
create policy "fin_lanc_modify" on fin_lancamentos for update
  using (
    (auth_role() in ('master', 'admin_financeiro') and church_group_id = auth_group_id())
    or
    (auth_role() = 'tesoureiro' and created_by = auth.uid() and church_group_id = auth_group_id())
  );

drop policy if exists "fin_lanc_delete" on fin_lancamentos;
create policy "fin_lanc_delete" on fin_lancamentos for delete
  using (
    (auth_role() in ('master', 'admin_financeiro') and church_group_id = auth_group_id())
    or
    (auth_role() = 'tesoureiro' and created_by = auth.uid() and church_group_id = auth_group_id())
  );

-- ============================================================================
-- 5) fin_recibos
-- SELECT: qualquer usuário do grupo
-- INSERT: master, admin_financeiro, admin_secretaria, tesoureiro
-- UPDATE: master, admin_financeiro, admin_secretaria (anular recibo)
-- ============================================================================
drop policy if exists "fin_recibos_select" on fin_recibos;
create policy "fin_recibos_select" on fin_recibos for select
  using (church_group_id = auth_group_id());

drop policy if exists "fin_recibos_insert" on fin_recibos;
create policy "fin_recibos_insert" on fin_recibos for insert
  with check (
    auth_role() in ('master', 'admin_financeiro', 'admin_secretaria', 'tesoureiro')
    and church_group_id = auth_group_id()
  );

drop policy if exists "fin_recibos_update" on fin_recibos;
create policy "fin_recibos_update" on fin_recibos for update
  using (
    auth_role() in ('master', 'admin_financeiro', 'admin_secretaria')
    and church_group_id = auth_group_id()
  );

-- ============================================================================
-- 6) fin_tesoureiros
-- SELECT: qualquer usuário do grupo (tesoureiro precisa se selecionar)
-- WRITE:  master only
-- ============================================================================
drop policy if exists "fin_tesoureiros_select" on fin_tesoureiros;
create policy "fin_tesoureiros_select" on fin_tesoureiros for select
  using (church_group_id = auth_group_id());

-- ============================================================================
-- 7) gen_fin_recibo_numero — advisory lock (elimina race condition)
-- ============================================================================
create or replace function gen_fin_recibo_numero(p_group_id uuid)
returns text as $$
declare
  v_seq  bigint;
  v_ano  text;
  v_lock bigint;
begin
  v_lock := ('x' || encode(p_group_id::text::bytea, 'hex'))::bit(64)::bigint;
  perform pg_advisory_xact_lock(v_lock);
  v_ano := to_char(now(), 'YYYY');
  select coalesce(
    max((regexp_match(numero, '\d+$'))[1]::bigint), 0
  ) + 1
  into v_seq
  from fin_recibos
  where church_group_id = p_group_id
    and numero like 'REC-' || v_ano || '-%';
  return 'REC-' || v_ano || '-' || lpad(v_seq::text, 4, '0');
end;
$$ language plpgsql security definer;

-- ============================================================================
-- FIM 017_fix_rls_consolidado.sql
-- ============================================================================
