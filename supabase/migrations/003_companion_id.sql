-- ============================================================================
-- 003_companion_id.sql — adiciona companion_id em member_ministry
-- ============================================================================
-- Permite vincular o "acompanhado por" a um membro real do sistema, alem
-- do nome livre que ja existe (companion).
-- ============================================================================

alter table member_ministry
  add column if not exists companion_id uuid references members(id) on delete set null;

create index if not exists idx_ministry_companion on member_ministry(companion_id);

-- Auditoria ja cobre via trigger generica (audit_member_ministry)
