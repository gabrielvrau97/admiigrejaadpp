-- ============================================================================
-- 006_pastor_dirigente.sql — Adiciona referência ao pastor dirigente da igreja
-- ============================================================================
-- Adiciona uma FK em churches.pastor_id apontando pra members(id).
-- Se o pastor for deletado, o campo vira null automaticamente (set null).
-- Restrição: pastor precisa ser member_type='membro' (validado em trigger).
-- ============================================================================

alter table churches
  add column if not exists pastor_id uuid references members(id) on delete set null;

create index if not exists idx_churches_pastor on churches(pastor_id);

-- Trigger pra garantir que pastor_id aponta pra um membro (não visitante/seminarista)
create or replace function check_pastor_is_member()
returns trigger as $$
begin
  if new.pastor_id is not null then
    if not exists (
      select 1 from members
      where id = new.pastor_id
        and member_type = 'membro'
        and status != 'deleted'
    ) then
      raise exception 'pastor_id deve referenciar um membro ativo (member_type = membro)';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_churches_check_pastor on churches;
create trigger trg_churches_check_pastor
  before insert or update of pastor_id on churches
  for each row execute function check_pastor_is_member();

-- ============================================================================
-- FIM 006_pastor_dirigente.sql
-- ============================================================================
