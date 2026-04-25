// Smoke test — valida integração Supabase end-to-end
// Roda com: node scripts/smoke-test.mjs <email> <senha>
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync(new URL('../.env', import.meta.url), 'utf8')
  .split('\n').filter(Boolean).reduce((acc, line) => {
    const [k, ...rest] = line.split('=')
    if (k) acc[k.trim()] = rest.join('=').trim()
    return acc
  }, {})

const SUPA_URL = env.VITE_SUPABASE_URL
const SUPA_KEY = env.VITE_SUPABASE_ANON_KEY
const [, , email, password] = process.argv

if (!email || !password) {
  console.error('Uso: node scripts/smoke-test.mjs <email> <senha>')
  process.exit(1)
}

const supabase = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } })

const log = (icon, msg) => console.log(`${icon} ${msg}`)
const fail = (msg, err) => { console.error(`❌ ${msg}`, err?.message ?? err); process.exit(1) }

let createdMemberId = null
let createdSeminarioId = null
let createdMatriculaId = null
let createdCarteirinhaId = null
let createdCertificadoId = null

async function run() {
  log('🔐', 'Logando...')
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({ email, password })
  if (authErr) fail('Falha no login', authErr)
  log('✅', `Logado como ${auth.user.email} (id: ${auth.user.id.slice(0, 8)}...)`)

  // 1) Verifica perfil em app_users
  log('👤', 'Lendo perfil em app_users...')
  const { data: profile, error: pErr } = await supabase
    .from('app_users').select('*').eq('id', auth.user.id).single()
  if (pErr || !profile) fail('Perfil não encontrado', pErr)
  log('✅', `Perfil: role=${profile.role}, active=${profile.active}, group=${profile.church_group_id}`)

  // 2) Lista igrejas
  log('⛪', 'Listando igrejas...')
  const { data: churches, error: cErr } = await supabase.from('churches').select('*')
  if (cErr) fail('Erro ao listar igrejas', cErr)
  log('✅', `${churches.length} igreja(s) encontrada(s): ${churches.map(c => c.name).join(', ')}`)
  const churchId = churches[0].id

  // 3) Lista config_options
  log('⚙️', 'Listando config_options...')
  const { data: configs, error: cfgErr } = await supabase.from('config_options').select('category').eq('active', true)
  if (cfgErr) fail('Erro ao listar configs', cfgErr)
  const counts = configs.reduce((acc, r) => { acc[r.category] = (acc[r.category] ?? 0) + 1; return acc }, {})
  log('✅', `Configs: ${JSON.stringify(counts)}`)

  // 4) Cria membro de teste
  log('👨', 'Criando membro de teste...')
  const { data: newMember, error: mErr } = await supabase
    .from('members')
    .insert({
      church_id: churchId,
      member_type: 'membro',
      status: 'ativo',
      name: 'Smoke Test User',
      cpf: '11122233344',
      birth_date: '1990-05-15',
      sex: 'masculino',
    })
    .select('*').single()
  if (mErr) fail('Erro ao criar membro', mErr)
  createdMemberId = newMember.id
  log('✅', `Membro criado: ${newMember.name} (id: ${createdMemberId.slice(0, 8)}...)`)

  // 5) Adiciona contacts e ministry pra esse membro
  log('📞', 'Adicionando contatos e ministério...')
  const { error: contErr } = await supabase.from('member_contacts').insert({
    member_id: createdMemberId,
    emails: ['smoke@test.com'],
    phones: ['62999999999'],
    cellphone1: '62999999999',
    city: 'Piracanjuba',
  })
  if (contErr) fail('Erro ao criar contacts', contErr)

  const { error: minErr } = await supabase.from('member_ministry').insert({
    member_id: createdMemberId,
    titles: ['Membro'],
    ministries: ['Louvor'],
  })
  if (minErr) fail('Erro ao criar ministry', minErr)
  log('✅', 'Contacts + Ministry inseridos')

  // 6) Update do membro
  log('✏️', 'Atualizando membro...')
  const { error: updErr } = await supabase.from('members')
    .update({ apelido: 'Smokey', baptism: true, baptism_date: '2020-01-01' })
    .eq('id', createdMemberId)
  if (updErr) fail('Erro ao atualizar', updErr)
  log('✅', 'Membro atualizado')

  // 7) Read com joins (igual a listMembers da API)
  log('📋', 'Lendo membro com joins...')
  const { data: full, error: fErr } = await supabase
    .from('members')
    .select(`
      id, name, apelido, baptism, baptism_date,
      church:churches!church_id(name),
      contacts:member_contacts!member_contacts_member_id_fkey(cellphone1, emails, city),
      ministry:member_ministry!member_ministry_member_id_fkey(titles, ministries)
    `)
    .eq('id', createdMemberId).single()
  if (fErr) fail('Erro ao ler com join', fErr)
  log('✅', `Joins OK — apelido=${full.apelido}, batismo=${full.baptism}, igreja=${full.church?.name}, cel=${full.contacts?.cellphone1 ?? full.contacts?.[0]?.cellphone1}, ministerios=${JSON.stringify(full.ministry?.ministries ?? full.ministry?.[0]?.ministries)}`)

  // 8) Cria seminário
  log('🎓', 'Criando seminário...')
  const { data: sem, error: sErr } = await supabase.from('seminarios').insert({
    nome: 'Smoke Seminário',
    instrutor: 'Pastor Teste',
    data_inicio: '2026-05-01',
    data_fim: '2026-06-01',
    carga_horaria: 40,
    church_id: churchId,
    status: 'em_andamento',
  }).select('*').single()
  if (sErr) fail('Erro ao criar seminário', sErr)
  createdSeminarioId = sem.id
  log('✅', `Seminário criado: ${sem.nome}`)

  // 9) Matricula o membro
  log('📝', 'Matriculando membro no seminário...')
  const { data: mat, error: matErr } = await supabase.from('matriculas').insert({
    seminario_id: createdSeminarioId,
    member_id: createdMemberId,
    nome: full.name,
    church_id: churchId,
    situacao: 'concluido',
    nota_final: 9.5,
    frequencia: 95,
    data_matricula: '2026-05-01',
    data_conclusao: '2026-06-01',
  }).select('*').single()
  if (matErr) fail('Erro ao matricular', matErr)
  createdMatriculaId = mat.id
  log('✅', `Matriculado: nota ${mat.nota_final}, frequência ${mat.frequencia}%`)

  // 10) Gera certificado
  log('🏆', 'Gerando certificado...')
  const { data: cert, error: certErr } = await supabase.from('certificados').insert({
    matricula_id: createdMatriculaId,
    seminario_id: createdSeminarioId,
    numero: `CERT-SMOKE-${Date.now()}`,
    nome_aluno: full.name,
    nome_seminario: sem.nome,
    carga_horaria: sem.carga_horaria,
    data_conclusao: '2026-06-01',
    emitido_em: '2026-06-15',
    emitido_por: 'Smoke Test',
    status: 'emitido',
  }).select('*').single()
  if (certErr) fail('Erro ao gerar certificado', certErr)
  createdCertificadoId = cert.id
  log('✅', `Certificado: ${cert.numero}`)

  // 11) Gera carteirinha
  log('🪪', 'Gerando carteirinha...')
  const { data: cart, error: cartErr } = await supabase.from('carteirinhas').insert({
    member_id: createdMemberId,
    numero: `ADP-SMOKE-${Date.now()}`,
    motivo: 'primeira_via',
    emitida_em: '2026-04-25',
    valida_ate: '2028-04-25',
    emitida_por: 'Smoke Test',
    status: 'ativa',
  }).select('*').single()
  if (cartErr) fail('Erro ao gerar carteirinha', cartErr)
  createdCarteirinhaId = cart.id
  log('✅', `Carteirinha: ${cart.numero}`)

  // 12) Verifica activity_log
  log('🕵️', 'Conferindo activity_log...')
  const { data: logs, error: logErr } = await supabase
    .from('activity_log')
    .select('table_name, action, changed_at')
    .eq('user_id', auth.user.id)
    .gte('changed_at', new Date(Date.now() - 60_000).toISOString())
    .order('changed_at', { ascending: false })
  if (logErr) fail('Erro ao ler audit log', logErr)
  const summary = logs.reduce((acc, r) => {
    const k = `${r.table_name}/${r.action}`
    acc[k] = (acc[k] ?? 0) + 1
    return acc
  }, {})
  log('✅', `Audit log (último minuto): ${JSON.stringify(summary)}`)

  // 13) Cleanup — soft delete e delete
  log('🧹', 'Limpando dados de teste...')
  await supabase.from('certificados').delete().eq('id', createdCertificadoId)
  await supabase.from('carteirinhas').delete().eq('id', createdCarteirinhaId)
  await supabase.from('matriculas').delete().eq('id', createdMatriculaId)
  await supabase.from('seminarios').delete().eq('id', createdSeminarioId)
  await supabase.from('member_contacts').delete().eq('member_id', createdMemberId)
  await supabase.from('member_ministry').delete().eq('member_id', createdMemberId)
  await supabase.from('members').delete().eq('id', createdMemberId)
  log('✅', 'Cleanup completo')

  // Logout
  await supabase.auth.signOut()
  console.log('\n🎉 SMOKE TEST PASSOU — todos os fluxos funcionando!')
}

run().catch(e => { console.error('💥 Erro inesperado:', e); process.exit(1) })
