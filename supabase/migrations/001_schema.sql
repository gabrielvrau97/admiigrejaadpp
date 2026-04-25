-- ============================================================================
-- 001_schema.sql — Estrutura completa do banco
-- Site ADM ADP / Igreja Digital
-- ============================================================================
-- ORDEM DE EXECUÇÃO: este arquivo PRIMEIRO, depois 002_rls.sql, depois seed.sql
-- ============================================================================

-- Extensões necessárias
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================================
-- 1) ORGANIZACIONAL
-- ============================================================================

-- Grupo de igrejas (ex: "ADP Piracanjuba" inteira)
create table church_groups (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamptz not null default now()
);

-- Cada igreja individual (sede ou filial)
create table churches (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references church_groups(id) on delete cascade,
  name text not null,
  type text not null check (type in ('sede','filial')),
  address text,
  phone text,
  email text,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_churches_group on churches(group_id);

-- ============================================================================
-- 2) PESSOAS — tabela única que serve membros, visitantes e seminaristas
-- ============================================================================

create table members (
  id uuid primary key default uuid_generate_v4(),
  church_id uuid not null references churches(id) on delete restrict,
  member_type text not null default 'membro'
    check (member_type in ('membro','visitante','seminarista')),
  status text not null default 'ativo'
    check (status in ('ativo','inativo','indisponivel','deleted')),

  -- Identificação
  name text not null,
  apelido text,
  sex text check (sex in ('masculino','feminino')),
  birth_date date,
  civil_status text check (civil_status in ('solteiro','casado','uniao_estavel','divorciado','viuvo')),
  nationality text default 'Brasil',
  naturalidade text,
  cpf text,
  identity text,
  schooling text,
  occupation text,
  code text,

  -- Entrada / saída
  entry_date date,
  entry_reason text,
  entry_reason_other text,
  origin_church text,
  how_arrived text,
  how_arrived_other text,
  novo_convertido boolean default false,
  exit_date date,
  exit_reason text,
  exit_reason_other text,

  -- Vida espiritual
  baptism boolean default false,
  baptism_date date,
  baptism_spirit boolean default false,
  baptism_spirit_date date,
  conversion boolean default false,
  conversion_date date,

  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- CPF único por igreja (entre membros não-deletados)
-- Obs: pra unicidade por grupo de igrejas, vamos validar via app/trigger no futuro;
-- index parcial simples por (church_id, cpf) já cobre 99% dos casos reais.
create unique index idx_members_cpf_per_church
  on members(church_id, cpf)
  where cpf is not null and status != 'deleted';

create index idx_members_church on members(church_id);
create index idx_members_status on members(status);
create index idx_members_type on members(member_type);
create index idx_members_name on members(name);
create index idx_members_birth on members(birth_date);

-- Contatos (1-pra-1 com members)
create table member_contacts (
  member_id uuid primary key references members(id) on delete cascade,
  emails text[] default '{}',
  phones text[] default '{}',
  cellphone1 text,
  cep text,
  address text,
  number text,
  complement text,
  neighborhood text,
  city text,
  state text,
  country text default 'Brasil',
  updated_at timestamptz not null default now()
);

-- Família (1-pra-1)
create table member_family (
  member_id uuid primary key references members(id) on delete cascade,
  spouse_id uuid references members(id) on delete set null,
  spouse_name text,
  spouse_birth_date date,
  wedding_date date,
  father_id uuid references members(id) on delete set null,
  father_name text,
  mother_id uuid references members(id) on delete set null,
  mother_name text,
  updated_at timestamptz not null default now()
);

-- Filhos (1-pra-N) — pode ser filho cadastrado como membro ou só nome avulso
create table member_children (
  id uuid primary key default uuid_generate_v4(),
  parent_id uuid not null references members(id) on delete cascade,
  child_member_id uuid references members(id) on delete set null,
  name text not null,
  birth_date date,
  created_at timestamptz not null default now()
);

create index idx_children_parent on member_children(parent_id);

-- Ministério (1-pra-1, arrays JSONB pra economia)
create table member_ministry (
  member_id uuid primary key references members(id) on delete cascade,
  titles text[] default '{}',
  ministries text[] default '{}',
  departments text[] default '{}',
  functions text[] default '{}',
  companion text,
  discipler_id uuid references members(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- 3) SEMINÁRIOS
-- ============================================================================

create table seminarios (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  descricao text,
  instrutor text,
  data_inicio date not null,
  data_fim date,
  carga_horaria integer not null default 0,
  local text,
  church_id uuid references churches(id) on delete set null,
  status text not null default 'planejado'
    check (status in ('planejado','em_andamento','concluido','cancelado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (data_fim is null or data_fim >= data_inicio)
);

create index idx_seminarios_church on seminarios(church_id);
create index idx_seminarios_status on seminarios(status);

-- Matrículas — vincula pessoa a seminário, reaproveita dados de members quando possível
create table matriculas (
  id uuid primary key default uuid_generate_v4(),
  seminario_id uuid not null references seminarios(id) on delete cascade,
  member_id uuid references members(id) on delete set null,
  -- Snapshot dos dados do aluno no momento da matrícula
  -- (se member_id existir, pode ser puxado da view; se não, dados avulsos)
  nome text not null,
  apelido text,
  cpf text,
  birth_date date,
  sex text check (sex in ('masculino','feminino')),
  email text,
  telefone text,
  cidade text,
  estado text,
  church_id uuid references churches(id) on delete set null,
  situacao text not null default 'cursando'
    check (situacao in ('cursando','concluido','desistente','reprovado','trancado')),
  nota_final numeric(5,2) check (nota_final is null or (nota_final >= 0 and nota_final <= 10)),
  frequencia numeric(5,2) check (frequencia is null or (frequencia >= 0 and frequencia <= 100)),
  data_matricula date not null default current_date,
  data_conclusao date,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_matriculas_seminario on matriculas(seminario_id);
create index idx_matriculas_member on matriculas(member_id);
create index idx_matriculas_situacao on matriculas(situacao);

-- Certificados emitidos (snapshot do que existia no momento da emissão)
create table certificados (
  id uuid primary key default uuid_generate_v4(),
  matricula_id uuid not null references matriculas(id) on delete restrict,
  seminario_id uuid not null references seminarios(id) on delete restrict,
  numero text not null unique,
  nome_aluno text not null,
  nome_seminario text not null,
  carga_horaria integer not null,
  data_conclusao date not null,
  emitido_em date not null default current_date,
  emitido_por text,
  status text not null default 'emitido'
    check (status in ('emitido','cancelado','reemitido')),
  observacoes text,
  created_at timestamptz not null default now()
);

create index idx_certificados_matricula on certificados(matricula_id);
create index idx_certificados_status on certificados(status);

-- ============================================================================
-- 4) CARTEIRINHAS
-- ============================================================================

create table carteirinhas (
  id uuid primary key default uuid_generate_v4(),
  member_id uuid not null references members(id) on delete cascade,
  numero text not null unique,
  motivo text not null
    check (motivo in ('primeira_via','renovacao','segunda_via','atualizacao_dados')),
  emitida_em date not null default current_date,
  valida_ate date not null,
  emitida_por text,
  status text not null default 'ativa'
    check (status in ('ativa','vencida','cancelada','substituida')),
  observacoes text,
  created_at timestamptz not null default now()
);

create index idx_carteirinhas_member on carteirinhas(member_id);
create index idx_carteirinhas_status on carteirinhas(status);
create index idx_carteirinhas_validade on carteirinhas(valida_ate);

-- ============================================================================
-- 5) EVENTOS / CULTOS COM PRESENÇA
-- ============================================================================

create table eventos (
  id uuid primary key default uuid_generate_v4(),
  church_id uuid not null references churches(id) on delete cascade,
  nome text not null,
  tipo text default 'culto'
    check (tipo in ('culto','reuniao','evento_especial','seminario','outro')),
  descricao text,
  data_inicio timestamptz not null,
  data_fim timestamptz,
  local text,
  status text not null default 'agendado'
    check (status in ('agendado','realizado','cancelado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_eventos_church on eventos(church_id);
create index idx_eventos_data on eventos(data_inicio);
create index idx_eventos_status on eventos(status);

-- Lista de presença
create table presencas (
  id uuid primary key default uuid_generate_v4(),
  evento_id uuid not null references eventos(id) on delete cascade,
  member_id uuid references members(id) on delete set null,
  -- snapshot pra caso o membro seja deletado
  nome_visitante text,
  presente boolean not null default true,
  observacoes text,
  registrado_em timestamptz not null default now(),
  -- não pode ter membro duplicado no mesmo evento
  unique (evento_id, member_id)
);

create index idx_presencas_evento on presencas(evento_id);
create index idx_presencas_member on presencas(member_id);

-- ============================================================================
-- 6) USUÁRIOS DO SISTEMA E CONFIGURAÇÕES
-- ============================================================================

-- Usuários da aplicação (vinculados ao auth.users do Supabase)
create table app_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  role text not null default 'visualizador'
    check (role in ('master','admin','secretaria','visualizador')),
  church_group_id uuid references church_groups(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_app_users_group on app_users(church_group_id);

-- Igrejas que cada usuário pode acessar
create table app_user_churches (
  user_id uuid not null references app_users(id) on delete cascade,
  church_id uuid not null references churches(id) on delete cascade,
  primary key (user_id, church_id)
);

-- Listas configuráveis (títulos, ministérios, motivos)
create table config_options (
  id uuid primary key default uuid_generate_v4(),
  church_group_id uuid not null references church_groups(id) on delete cascade,
  category text not null
    check (category in ('titulo','ministerio','departamento','funcao','motivo_entrada','motivo_saida')),
  value text not null,
  display_order integer default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (church_group_id, category, value)
);

create index idx_config_group on config_options(church_group_id, category);

-- ============================================================================
-- 7) NOTIFICAÇÕES E AUDITORIA
-- ============================================================================

create table notifications (
  id uuid primary key default uuid_generate_v4(),
  church_group_id uuid not null references church_groups(id) on delete cascade,
  user_id uuid references app_users(id) on delete cascade,
  type text not null,
  message text not null,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_notif_group on notifications(church_group_id);
create index idx_notif_user_unread on notifications(user_id, read) where read = false;

-- Log de auditoria — TODAS as alterações ficam aqui
create table activity_log (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references app_users(id) on delete set null,
  user_email text,  -- snapshot
  church_id uuid,
  table_name text not null,
  record_id uuid,
  action text not null check (action in ('insert','update','delete')),
  old_data jsonb,
  new_data jsonb,
  changed_at timestamptz not null default now()
);

create index idx_audit_table on activity_log(table_name, record_id);
create index idx_audit_user on activity_log(user_id);
create index idx_audit_date on activity_log(changed_at desc);

-- ============================================================================
-- 8) TRIGGERS
-- ============================================================================

-- Trigger pra atualizar updated_at automaticamente
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_churches_updated before update on churches
  for each row execute function set_updated_at();
create trigger trg_members_updated before update on members
  for each row execute function set_updated_at();
create trigger trg_contacts_updated before update on member_contacts
  for each row execute function set_updated_at();
create trigger trg_family_updated before update on member_family
  for each row execute function set_updated_at();
create trigger trg_ministry_updated before update on member_ministry
  for each row execute function set_updated_at();
create trigger trg_seminarios_updated before update on seminarios
  for each row execute function set_updated_at();
create trigger trg_matriculas_updated before update on matriculas
  for each row execute function set_updated_at();
create trigger trg_eventos_updated before update on eventos
  for each row execute function set_updated_at();
create trigger trg_app_users_updated before update on app_users
  for each row execute function set_updated_at();

-- Trigger genérica de auditoria — registra TODA mudança em activity_log
create or replace function audit_trigger_func()
returns trigger as $$
declare
  v_user_id uuid;
  v_user_email text;
  v_old jsonb;
  v_new jsonb;
begin
  -- pega usuário autenticado se existir
  v_user_id := auth.uid();
  begin
    select email into v_user_email from app_users where id = v_user_id;
  exception when others then
    v_user_email := null;
  end;

  if (TG_OP = 'DELETE') then
    v_old := to_jsonb(OLD);
    v_new := null;
  elsif (TG_OP = 'UPDATE') then
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
  else  -- INSERT
    v_old := null;
    v_new := to_jsonb(NEW);
  end if;

  insert into activity_log (user_id, user_email, table_name, record_id, action, old_data, new_data)
  values (
    v_user_id,
    v_user_email,
    TG_TABLE_NAME,
    coalesce((v_new->>'id')::uuid, (v_old->>'id')::uuid),
    lower(TG_OP),
    v_old,
    v_new
  );

  if (TG_OP = 'DELETE') then return OLD; else return NEW; end if;
end;
$$ language plpgsql security definer;

-- Aplica auditoria nas tabelas principais
create trigger audit_members after insert or update or delete on members
  for each row execute function audit_trigger_func();
create trigger audit_member_contacts after insert or update or delete on member_contacts
  for each row execute function audit_trigger_func();
create trigger audit_member_family after insert or update or delete on member_family
  for each row execute function audit_trigger_func();
create trigger audit_member_children after insert or update or delete on member_children
  for each row execute function audit_trigger_func();
create trigger audit_member_ministry after insert or update or delete on member_ministry
  for each row execute function audit_trigger_func();
create trigger audit_seminarios after insert or update or delete on seminarios
  for each row execute function audit_trigger_func();
create trigger audit_matriculas after insert or update or delete on matriculas
  for each row execute function audit_trigger_func();
create trigger audit_certificados after insert or update or delete on certificados
  for each row execute function audit_trigger_func();
create trigger audit_carteirinhas after insert or update or delete on carteirinhas
  for each row execute function audit_trigger_func();
create trigger audit_eventos after insert or update or delete on eventos
  for each row execute function audit_trigger_func();
create trigger audit_presencas after insert or update or delete on presencas
  for each row execute function audit_trigger_func();
create trigger audit_churches after insert or update or delete on churches
  for each row execute function audit_trigger_func();
create trigger audit_app_users after insert or update or delete on app_users
  for each row execute function audit_trigger_func();
create trigger audit_config after insert or update or delete on config_options
  for each row execute function audit_trigger_func();

-- ============================================================================
-- FIM 001_schema.sql — agora rode 002_rls.sql
-- ============================================================================
