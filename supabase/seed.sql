-- ============================================================================
-- seed.sql — Dados iniciais
-- Site ADM ADP / Igreja Digital
-- ============================================================================
-- DEPENDE DE: 001_schema.sql + 002_rls.sql terem rodado antes
-- IMPORTANTE: rode esse arquivo COM RLS desativado temporariamente OU
--             como super-user pelo SQL Editor do Supabase (que ignora RLS)
-- ============================================================================

-- 1) Cria o grupo de igrejas inicial
insert into church_groups (id, name)
values ('00000000-0000-0000-0000-000000000001', 'ADP Piracanjuba')
on conflict (id) do nothing;

-- 2) Cria a sede inicial (você edita os dados depois pelo painel)
insert into churches (id, group_id, name, type, address, phone, email)
values (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'ADP Piracanjuba — Sede',
  'sede',
  null, null, null
) on conflict (id) do nothing;

-- 3) Popular config_options com os defaults que existiam no ConfigContext
do $$
declare
  g_id uuid := '00000000-0000-0000-0000-000000000001';
begin
  -- Títulos
  insert into config_options (church_group_id, category, value, display_order) values
    (g_id,'titulo','Apóstolo/a',1),
    (g_id,'titulo','Aspirante',2),
    (g_id,'titulo','Bispo/a',3),
    (g_id,'titulo','Conselheiro/a',4),
    (g_id,'titulo','Cooperador/a',5),
    (g_id,'titulo','Diácono/Diaconisa',6),
    (g_id,'titulo','Dirigente',7),
    (g_id,'titulo','Evangelista',8),
    (g_id,'titulo','Membro',9),
    (g_id,'titulo','Mestre',10),
    (g_id,'titulo','Ministro/a',11),
    (g_id,'titulo','Missionário/a',12),
    (g_id,'titulo','Músico',13),
    (g_id,'titulo','Obreiro/a',14),
    (g_id,'titulo','Oficial',15),
    (g_id,'titulo','Pastor/a',16),
    (g_id,'titulo','Presbítero',17),
    (g_id,'titulo','Profeta/Profetisa',18),
    (g_id,'titulo','Reverendo',19)
  on conflict do nothing;

  -- Ministérios
  insert into config_options (church_group_id, category, value, display_order) values
    (g_id,'ministerio','Louvor',1),
    (g_id,'ministerio','Intercessão',2),
    (g_id,'ministerio','Evangelismo',3),
    (g_id,'ministerio','Diaconia',4),
    (g_id,'ministerio','Ensino',5),
    (g_id,'ministerio','Infanto-Juvenil',6),
    (g_id,'ministerio','Casais',7),
    (g_id,'ministerio','Homens',8),
    (g_id,'ministerio','Mulheres',9),
    (g_id,'ministerio','Jovens',10)
  on conflict do nothing;

  -- Departamentos
  insert into config_options (church_group_id, category, value, display_order) values
    (g_id,'departamento','Administrativo',1),
    (g_id,'departamento','Financeiro',2),
    (g_id,'departamento','Comunicação',3),
    (g_id,'departamento','Patrimônio',4),
    (g_id,'departamento','Secretaria',5),
    (g_id,'departamento','Pastoral',6)
  on conflict do nothing;

  -- Funções
  insert into config_options (church_group_id, category, value, display_order) values
    (g_id,'funcao','Auxiliar',1),
    (g_id,'funcao','Presidente',2),
    (g_id,'funcao','Secretário/a',3),
    (g_id,'funcao','Tesoureiro/a',4),
    (g_id,'funcao','Comissão Fiscal',5),
    (g_id,'funcao','Vice-Presidente',6),
    (g_id,'funcao','Diretor/a',7)
  on conflict do nothing;

  -- Motivos de entrada
  insert into config_options (church_group_id, category, value, display_order) values
    (g_id,'motivo_entrada','Aclamação',1),
    (g_id,'motivo_entrada','Adesão',2),
    (g_id,'motivo_entrada','Afiliação',3),
    (g_id,'motivo_entrada','Batismo',4),
    (g_id,'motivo_entrada','Conversão',5),
    (g_id,'motivo_entrada','Jurisdição',6),
    (g_id,'motivo_entrada','Membro Fundador',7),
    (g_id,'motivo_entrada','Motivo Pessoal',8),
    (g_id,'motivo_entrada','Profissão de Fé',9),
    (g_id,'motivo_entrada','Reconciliação',10),
    (g_id,'motivo_entrada','Transferência',11),
    (g_id,'motivo_entrada','Outro',12)
  on conflict do nothing;

  -- Motivos de saída
  insert into config_options (church_group_id, category, value, display_order) values
    (g_id,'motivo_saida','A Pedido',1),
    (g_id,'motivo_saida','Abandono',2),
    (g_id,'motivo_saida','Desligamento',3),
    (g_id,'motivo_saida','Exclusão',4),
    (g_id,'motivo_saida','Falecimento',5),
    (g_id,'motivo_saida','Motivo Pessoal',6),
    (g_id,'motivo_saida','Profissão de Fé',7),
    (g_id,'motivo_saida','Transferência',8),
    (g_id,'motivo_saida','Outro',9)
  on conflict do nothing;
end $$;

-- 4) Vincular o usuário master (que você criou em Auth) ao grupo
-- IMPORTANTE: edite a linha abaixo trocando 'SEU_EMAIL_AQUI@exemplo.com'
--             pelo email que você usou em Authentication > Users
do $$
declare
  master_email text := 'SEU_EMAIL_AQUI@exemplo.com';  -- <<< EDITE AQUI
  master_id uuid;
begin
  select id into master_id from auth.users where email = master_email limit 1;

  if master_id is not null then
    insert into app_users (id, email, name, role, church_group_id, active)
    values (
      master_id,
      master_email,
      'Administrador Master',
      'master',
      '00000000-0000-0000-0000-000000000001',
      true
    )
    on conflict (id) do update set role = 'master', active = true;

    insert into app_user_churches (user_id, church_id)
    values (master_id, '00000000-0000-0000-0000-000000000010')
    on conflict do nothing;

    raise notice 'Usuário master vinculado: %', master_email;
  else
    raise notice 'AVISO: usuário com email % não encontrado em auth.users. Crie em Authentication > Users primeiro, depois rode este bloco novamente.', master_email;
  end if;
end $$;

-- ============================================================================
-- FIM seed.sql
-- ============================================================================
