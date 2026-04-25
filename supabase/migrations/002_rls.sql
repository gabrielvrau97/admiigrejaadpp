-- ============================================================================
-- 002_rls.sql — Row Level Security (segurança por linha)
-- Site ADM ADP / Igreja Digital
-- ============================================================================
-- DEPENDE DE: 001_schema.sql ter rodado antes
-- ============================================================================

-- ============================================================================
-- HELPERS — funções pra simplificar políticas
-- ============================================================================

-- Pega o role do usuário autenticado
create or replace function auth_role()
returns text as $$
  select role from app_users where id = auth.uid() and active = true;
$$ language sql stable security definer;

-- Pega o church_group do usuário autenticado
create or replace function auth_group_id()
returns uuid as $$
  select church_group_id from app_users where id = auth.uid() and active = true;
$$ language sql stable security definer;

-- Lista de church_ids que o usuário pode acessar
create or replace function auth_church_ids()
returns setof uuid as $$
  select church_id from app_user_churches where user_id = auth.uid();
$$ language sql stable security definer;

-- É master?
create or replace function is_master()
returns boolean as $$
  select coalesce(auth_role() = 'master', false);
$$ language sql stable security definer;

-- É admin do grupo?
create or replace function is_admin_or_master()
returns boolean as $$
  select coalesce(auth_role() in ('master','admin'), false);
$$ language sql stable security definer;

-- Pode escrever (não é só visualizador)?
create or replace function can_write()
returns boolean as $$
  select coalesce(auth_role() in ('master','admin','secretaria'), false);
$$ language sql stable security definer;

-- ============================================================================
-- HABILITA RLS EM TODAS AS TABELAS
-- ============================================================================

alter table church_groups enable row level security;
alter table churches enable row level security;
alter table members enable row level security;
alter table member_contacts enable row level security;
alter table member_family enable row level security;
alter table member_children enable row level security;
alter table member_ministry enable row level security;
alter table seminarios enable row level security;
alter table matriculas enable row level security;
alter table certificados enable row level security;
alter table carteirinhas enable row level security;
alter table eventos enable row level security;
alter table presencas enable row level security;
alter table app_users enable row level security;
alter table app_user_churches enable row level security;
alter table config_options enable row level security;
alter table notifications enable row level security;
alter table activity_log enable row level security;

-- ============================================================================
-- POLÍTICAS — CHURCH_GROUPS
-- ============================================================================
create policy "groups_select" on church_groups for select
  using (is_master() or id = auth_group_id());

create policy "groups_modify" on church_groups for all
  using (is_master())
  with check (is_master());

-- ============================================================================
-- POLÍTICAS — CHURCHES
-- ============================================================================
create policy "churches_select" on churches for select
  using (is_master() or group_id = auth_group_id());

create policy "churches_modify" on churches for all
  using (is_admin_or_master() and (is_master() or group_id = auth_group_id()))
  with check (is_admin_or_master() and (is_master() or group_id = auth_group_id()));

-- ============================================================================
-- POLÍTICAS — MEMBERS
-- ============================================================================
create policy "members_select" on members for select
  using (
    is_master()
    or church_id in (select auth_church_ids())
    or church_id in (select id from churches where group_id = auth_group_id() and is_admin_or_master())
  );

create policy "members_insert" on members for insert
  with check (
    can_write()
    and (is_master() or church_id in (select auth_church_ids())
         or church_id in (select id from churches where group_id = auth_group_id()))
  );

create policy "members_update" on members for update
  using (
    can_write()
    and (is_master() or church_id in (select auth_church_ids())
         or church_id in (select id from churches where group_id = auth_group_id()))
  );

create policy "members_delete" on members for delete
  using (
    is_admin_or_master()
    and (is_master() or church_id in (select id from churches where group_id = auth_group_id()))
  );

-- ============================================================================
-- POLÍTICAS — TABELAS LIGADAS A MEMBERS (herdam permissão do membro pai)
-- ============================================================================
create policy "contacts_all" on member_contacts for all
  using (member_id in (select id from members))  -- members já tem RLS, então isto filtra
  with check (member_id in (select id from members));

create policy "family_all" on member_family for all
  using (member_id in (select id from members))
  with check (member_id in (select id from members));

create policy "children_all" on member_children for all
  using (parent_id in (select id from members))
  with check (parent_id in (select id from members));

create policy "ministry_all" on member_ministry for all
  using (member_id in (select id from members))
  with check (member_id in (select id from members));

-- ============================================================================
-- POLÍTICAS — SEMINÁRIOS
-- ============================================================================
create policy "seminarios_select" on seminarios for select
  using (
    is_master()
    or church_id is null
    or church_id in (select auth_church_ids())
    or church_id in (select id from churches where group_id = auth_group_id())
  );

create policy "seminarios_modify" on seminarios for all
  using (
    can_write()
    and (is_master() or church_id is null
         or church_id in (select id from churches where group_id = auth_group_id()))
  )
  with check (
    can_write()
    and (is_master() or church_id is null
         or church_id in (select id from churches where group_id = auth_group_id()))
  );

create policy "matriculas_all" on matriculas for all
  using (seminario_id in (select id from seminarios))
  with check (seminario_id in (select id from seminarios) and can_write());

create policy "certificados_select" on certificados for select
  using (matricula_id in (select id from matriculas));

create policy "certificados_modify" on certificados for all
  using (can_write() and matricula_id in (select id from matriculas))
  with check (can_write() and matricula_id in (select id from matriculas));

-- ============================================================================
-- POLÍTICAS — CARTEIRINHAS
-- ============================================================================
create policy "carteirinhas_select" on carteirinhas for select
  using (member_id in (select id from members));

create policy "carteirinhas_modify" on carteirinhas for all
  using (can_write() and member_id in (select id from members))
  with check (can_write() and member_id in (select id from members));

-- ============================================================================
-- POLÍTICAS — EVENTOS
-- ============================================================================
create policy "eventos_select" on eventos for select
  using (
    is_master()
    or church_id in (select auth_church_ids())
    or church_id in (select id from churches where group_id = auth_group_id())
  );

create policy "eventos_modify" on eventos for all
  using (
    can_write()
    and (is_master() or church_id in (select id from churches where group_id = auth_group_id()))
  )
  with check (
    can_write()
    and (is_master() or church_id in (select id from churches where group_id = auth_group_id()))
  );

create policy "presencas_all" on presencas for all
  using (evento_id in (select id from eventos))
  with check (evento_id in (select id from eventos) and can_write());

-- ============================================================================
-- POLÍTICAS — USUÁRIOS DO SISTEMA
-- ============================================================================
create policy "app_users_select" on app_users for select
  using (
    is_master()
    or id = auth.uid()
    or (is_admin_or_master() and church_group_id = auth_group_id())
  );

create policy "app_users_modify" on app_users for all
  using (is_master() or (is_admin_or_master() and church_group_id = auth_group_id()))
  with check (is_master() or (is_admin_or_master() and church_group_id = auth_group_id()));

create policy "user_churches_all" on app_user_churches for all
  using (is_master() or user_id = auth.uid()
         or (is_admin_or_master() and user_id in (select id from app_users where church_group_id = auth_group_id())))
  with check (is_master() or (is_admin_or_master() and user_id in (select id from app_users where church_group_id = auth_group_id())));

-- ============================================================================
-- POLÍTICAS — CONFIG OPTIONS
-- ============================================================================
create policy "config_select" on config_options for select
  using (is_master() or church_group_id = auth_group_id());

create policy "config_modify" on config_options for all
  using (is_admin_or_master() and (is_master() or church_group_id = auth_group_id()))
  with check (is_admin_or_master() and (is_master() or church_group_id = auth_group_id()));

-- ============================================================================
-- POLÍTICAS — NOTIFICAÇÕES
-- ============================================================================
create policy "notif_select" on notifications for select
  using (
    user_id = auth.uid()
    or (user_id is null and (is_master() or church_group_id = auth_group_id()))
  );

create policy "notif_update" on notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "notif_insert" on notifications for insert
  with check (is_master() or church_group_id = auth_group_id());

-- ============================================================================
-- POLÍTICAS — ACTIVITY LOG (só leitura, ninguém edita)
-- ============================================================================
create policy "audit_select" on activity_log for select
  using (
    is_master()
    or (is_admin_or_master() and church_id in (select id from churches where group_id = auth_group_id()))
  );

-- inserção via trigger funciona como security definer, RLS não bloqueia

-- ============================================================================
-- FIM 002_rls.sql — agora rode seed.sql
-- ============================================================================
