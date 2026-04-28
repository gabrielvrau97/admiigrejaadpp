-- ============================================================================
-- 007_members_legacy_raw.sql — Tabela espelho pra dados do sistema antigo
-- ============================================================================
-- Objetivo: preservar 100% das colunas originais do arquivo Excel/CSV importado
-- em JSONB, mesmo que o frontend não use todos os campos. Permite consulta
-- futura, auditoria e rollback fácil.
--
-- Cada linha do arquivo vira uma linha aqui (raw_data) e, se migrada com
-- sucesso, member_id aponta pro registro real em members.
-- ============================================================================

create table if not exists members_legacy_raw (
  id uuid primary key default uuid_generate_v4(),
  member_id uuid references members(id) on delete set null,
  -- ↑ vincula ao membro real depois de migrado (null = ainda não migrou)

  source text not null,                  -- ex: 'sistema_antigo_2026_04_planilha_1'
  source_file text,                      -- nome do arquivo original
  source_sheet text,                     -- nome da aba/planilha (xlsx pode ter várias)
  source_row integer,                    -- número da linha no arquivo (1-based)
  imported_at timestamptz not null default now(),
  imported_by uuid references app_users(id) on delete set null,

  raw_data jsonb not null,               -- ← cada coluna do Excel vira chave aqui

  status text not null default 'pendente'
    check (status in ('pendente','migrado','duplicado','ignorado','erro')),
  match_method text,                     -- 'cpf', 'nome+nascimento', 'manual', null
  match_confidence text,                 -- 'alta', 'media', 'baixa' (futuro)
  notes text                             -- mensagem de erro ou observação
);

create index if not exists idx_legacy_status on members_legacy_raw(status);
create index if not exists idx_legacy_member on members_legacy_raw(member_id);
create index if not exists idx_legacy_source on members_legacy_raw(source);
create index if not exists idx_legacy_imported_at on members_legacy_raw(imported_at desc);

-- Index parcial: linhas que ainda precisam ser migradas (mais consultadas)
create index if not exists idx_legacy_pendentes
  on members_legacy_raw(source, source_row)
  where status = 'pendente';

-- ── RLS: só master/admin do grupo veem dados de migração ────────────────────
alter table members_legacy_raw enable row level security;

create policy "legacy_select" on members_legacy_raw for select
  using (is_admin_or_master());

create policy "legacy_modify" on members_legacy_raw for all
  using (is_admin_or_master())
  with check (is_admin_or_master());

-- ── Auditoria não é aplicada nessa tabela porque o volume seria gigante ─────
-- (mil linhas importadas = mil entradas em activity_log). O próprio member_id
-- vinculado já dá rastreio completo via auditoria de members.

-- ============================================================================
-- Consultas úteis (referência)
-- ============================================================================

-- Resumo de uma migração:
-- select source, status, count(*)
-- from members_legacy_raw
-- group by source, status
-- order by source, status;

-- Membros importados com seus dados extras do legacy:
-- select m.id, m.name, l.raw_data
-- from members m join members_legacy_raw l on l.member_id = m.id
-- where l.source = 'sistema_antigo_2026_04_planilha_1';

-- Procurar campo específico do legacy que não está no schema:
-- select member_id, raw_data->>'CarteiraSocial' as carteira
-- from members_legacy_raw
-- where raw_data ? 'CarteiraSocial';

-- ============================================================================
-- FIM 007_members_legacy_raw.sql
-- ============================================================================
