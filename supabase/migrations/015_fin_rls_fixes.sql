-- ============================================================================
-- 015_fin_rls_fixes.sql — Correção de políticas RLS do módulo financeiro
-- ============================================================================
-- Problemas corrigidos:
-- 1. fin_categorias: admin_secretaria não conseguia ler categorias (modal falhava silenciosamente)
-- 2. fin_fornecedores: idem para fornecedores
-- 3. fin_lancamentos select: admin_financeiro só via os próprios lançamentos;
--    intenção correta é ver tudo do grupo (igual ao extrato/dashboard que já filtra por grupo)
-- 4. gen_fin_recibo_numero: race condition no max() — migra para sequence por grupo
--    usando tabela auxiliar com lock (safe para o volume atual sem precisar de seq por grupo no PG)
-- ============================================================================

-- ============================================================================
-- 1) fin_categorias — leitura para qualquer usuário do módulo financeiro/secretaria
-- ============================================================================

drop policy if exists "fin_cat_select" on fin_categorias;

create policy "fin_cat_select" on fin_categorias for select
  using (
    auth_role() in ('master', 'admin_financeiro', 'admin_secretaria')
    and church_group_id = auth_group_id()
  );

-- ============================================================================
-- 2) fin_fornecedores — leitura para qualquer usuário do módulo financeiro/secretaria
-- ============================================================================

drop policy if exists "fin_forn_select" on fin_fornecedores;

create policy "fin_forn_select" on fin_fornecedores for select
  using (
    auth_role() in ('master', 'admin_financeiro', 'admin_secretaria')
    and church_group_id = auth_group_id()
  );

-- ============================================================================
-- 3) fin_lancamentos select — admin_financeiro vê tudo do grupo (não só os próprios)
-- ============================================================================

drop policy if exists "fin_lanc_select" on fin_lancamentos;

create policy "fin_lanc_select" on fin_lancamentos for select
  using (
    auth_role() in ('master', 'admin_financeiro')
    and church_group_id = auth_group_id()
  );

-- ============================================================================
-- 4) gen_fin_recibo_numero — elimina race condition com advisory lock
-- ============================================================================

create or replace function gen_fin_recibo_numero(p_group_id uuid)
returns text as $$
declare
  v_seq  bigint;
  v_ano  text;
  v_lock bigint;
begin
  -- advisory lock por grupo para serializar geração de número
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
-- FIM 015_fin_rls_fixes.sql
-- ============================================================================
