-- ============================================================================
-- 004_imprimir_credencial_e_igrejas.sql
-- ============================================================================
-- 1) Adiciona flag de fila de impressao de credencial em members
-- 2) Popula as 7 igrejas filiais (Sede ja foi criada no seed.sql)
-- ============================================================================

-- 1) Flag pra fila de impressao de credencial
alter table members
  add column if not exists imprimir_credencial boolean not null default false;

create index if not exists idx_members_imprimir_credencial
  on members(imprimir_credencial)
  where imprimir_credencial = true;

-- 2) Popular as 7 filiais (sem endereco/telefone/email — usuario preenche depois)
do $$
declare
  g_id uuid := '00000000-0000-0000-0000-000000000001';  -- ADP Piracanjuba (do seed)
begin
  insert into churches (group_id, name, type)
  values
    (g_id, 'ADP Bela Vista',      'filial'),
    (g_id, 'ADP Trevo Floresta',  'filial'),
    (g_id, 'ADP São José',        'filial'),
    (g_id, 'ADP Serra Negra',     'filial'),
    (g_id, 'ADP Areia',           'filial'),
    (g_id, 'ADP Integração',      'filial'),
    (g_id, 'ADP Hidrolândia',     'filial')
  on conflict do nothing;

  raise notice '7 filiais adicionadas (ou ja existiam).';
end $$;
