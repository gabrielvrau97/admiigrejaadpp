-- ============================================================================
-- 008_papeis_simplificados.sql — Adiciona papéis admin_secretaria e admin_financeiro
-- ============================================================================
-- Reorganiza papéis do sistema:
--   - master: acesso total (incl. gestão de usuários e backup)
--   - admin_secretaria: acessa Secretaria, Seminários, Credenciais, Certificados,
--     Igrejas, Configurações. NÃO acessa Usuários, Backup, Financeiro.
--   - admin_financeiro: acessa Financeiro e Meu Perfil. NÃO acessa o resto.
--
-- Papéis antigos (admin, secretaria, visualizador) ficam no enum por
-- compatibilidade histórica, mas não serão usados nas novas contas.
-- ============================================================================

-- 1. Atualiza o CHECK constraint pra aceitar os novos papéis
alter table app_users drop constraint if exists app_users_role_check;
alter table app_users add constraint app_users_role_check
  check (role in (
    'master',
    'admin_secretaria',
    'admin_financeiro',
    -- legados (não usar em novos cadastros):
    'admin',
    'secretaria',
    'visualizador'
  ));

-- 2. Atualiza funções helper de RLS pra reconhecer os novos papéis

-- is_admin_or_master agora abrange master + admin_secretaria + admin (legado)
-- (NOTA: admin_financeiro NÃO entra aqui — ele só mexe no financeiro)
create or replace function is_admin_or_master()
returns boolean as $$
  select coalesce(auth_role() in ('master','admin_secretaria','admin'), false);
$$ language sql stable security definer;

-- can_write inclui master + admin_secretaria + secretaria/admin (legados) + admin_financeiro
-- (admin_financeiro pode escrever no módulo financeiro futuro; pra membros/igrejas o RLS
--  não vai liberar porque as policies dessas tabelas filtram por can_write E
--  específicos. Aqui mantém a regra geral)
create or replace function can_write()
returns boolean as $$
  select coalesce(auth_role() in ('master','admin_secretaria','admin','secretaria','admin_financeiro'), false);
$$ language sql stable security definer;

-- 3. Restringe app_users e app_user_churches pra MASTER apenas
--    (o gerenciamento de usuários passa a ser exclusivo do master)
drop policy if exists "app_users_modify" on app_users;
create policy "app_users_modify" on app_users for all
  using (auth_role() = 'master')
  with check (auth_role() = 'master');

drop policy if exists "user_churches_all" on app_user_churches;
create policy "user_churches_all" on app_user_churches for all
  using (auth_role() = 'master' or user_id = auth.uid())
  with check (auth_role() = 'master');

-- 4. Activity log (auditoria): apenas master pode ler
drop policy if exists "audit_select" on activity_log;
create policy "audit_select" on activity_log for select
  using (auth_role() = 'master');

-- ============================================================================
-- FIM 008_papeis_simplificados.sql
-- ============================================================================
