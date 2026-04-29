/**
 * Script de importação do sistema antigo → Supabase
 *
 * Uso:
 *   node scripts/migration/import-legacy.mjs --dry-run    # simula, não insere
 *   node scripts/migration/import-legacy.mjs              # importação real
 *
 * Lê os 2 arquivos da pasta imports/:
 *   - BACKUP_Secretaria_Membros_Todos.xls   → 799 membros (member_type='membro')
 *   - Membros_2026-04-22.xlsx               → 60 visitantes (member_type='visitante')
 *
 * Estratégia:
 *   1. Insere TUDO em members_legacy_raw (raw_data com colunas originais)
 *   2. Cria registros reais em members + member_contacts + member_family + member_ministry
 *   3. Atualiza members_legacy_raw.member_id apontando pro real
 *   4. Detecta duplicados por nome+nascimento (não bloqueia, só sinaliza)
 *
 * Vínculos familiares (cônjuge/pai/mãe com código tipo 453693#NOME) ficam só
 * como texto na primeira passada. Resolver UUIDs reais depois com
 * resolve-family-links.mjs.
 */

import * as XLSX from 'xlsx'
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()  // carrega .env

const DRY_RUN = process.argv.includes('--dry-run')

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error('❌ Faltam variáveis no .env: VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

const HTML_ENTITIES = {
  '&aacute;': 'á', '&Aacute;': 'Á', '&agrave;': 'à', '&Agrave;': 'À',
  '&atilde;': 'ã', '&Atilde;': 'Ã', '&acirc;': 'â', '&Acirc;': 'Â',
  '&eacute;': 'é', '&Eacute;': 'É', '&egrave;': 'è', '&Egrave;': 'È',
  '&ecirc;': 'ê', '&Ecirc;': 'Ê',
  '&iacute;': 'í', '&Iacute;': 'Í', '&icirc;': 'î', '&Icirc;': 'Î',
  '&oacute;': 'ó', '&Oacute;': 'Ó', '&ograve;': 'ò', '&Ograve;': 'Ò',
  '&otilde;': 'õ', '&Otilde;': 'Õ', '&ocirc;': 'ô', '&Ocirc;': 'Ô',
  '&uacute;': 'ú', '&Uacute;': 'Ú', '&ucirc;': 'û', '&Ucirc;': 'Û',
  '&ccedil;': 'ç', '&Ccedil;': 'Ç',
  '&ntilde;': 'ñ', '&Ntilde;': 'Ñ',
  '&ordf;': 'ª', '&ordm;': 'º',
  '&amp;': '&', '&nbsp;': ' ', '&quot;': '"', '&apos;': "'",
}

function decodeHtml(s) {
  if (s === null || s === undefined) return s
  if (typeof s !== 'string') s = String(s)
  return s.replace(/&[a-zA-Z]+;/g, m => HTML_ENTITIES[m] ?? m).trim()
}

function parseBR(s) {
  // converte "Sim" → true, "Não" → false
  if (!s) return null
  const v = decodeHtml(String(s)).toLowerCase().trim()
  if (v === 'sim' || v === 'true') return true
  if (v === 'não' || v === 'nao' || v === 'false') return false
  return null
}

function parseDate(s) {
  // aceita "10/9/87", "21/04/1997", "26/02/2025", "26/02/2025, 10:03"
  // Também tolera formato US "M/D/YY" quando o XLSX retorna assim — detecta
  // pela posição: se um dos componentes for > 12, ele é o dia.
  if (!s) return null
  const str = String(s).split(',')[0].trim()  // tira hora se vier
  const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (!m) return null
  let [, a, b, yy] = m
  let dd, mm
  const aN = parseInt(a, 10)
  const bN = parseInt(b, 10)

  // Detecção de formato:
  // - Se a > 12 → a é dia (formato BR: D/M/Y)
  // - Senão se b > 12 → b é dia (formato US: M/D/Y)
  // - Senão (ambos <= 12) → assume BR (default brasileiro)
  if (aN > 12) {
    dd = a; mm = b
  } else if (bN > 12) {
    dd = b; mm = a
  } else {
    dd = a; mm = b  // padrão BR pra casos ambíguos
  }

  dd = dd.padStart(2, '0')
  mm = mm.padStart(2, '0')
  if (yy.length === 2) {
    const yyN = parseInt(yy, 10)
    yy = yyN < 30 ? `20${yy}` : `19${yy}`
  }

  // Validação básica
  const d = parseInt(dd, 10)
  const mo = parseInt(mm, 10)
  if (mo < 1 || mo > 12) return null
  if (d < 1 || d > 31) return null

  return `${yy}-${mm}-${dd}`
}

function cleanCPF(s) {
  if (!s) return null
  const digits = String(s).replace(/\D/g, '')
  if (digits.length !== 11) return null
  // Mantém formatado pra exibição, mas guarda padrão
  return s.includes('.') || s.includes('-') ? s.trim() : `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

function cleanPhone(s) {
  if (!s) return null
  const t = String(s).trim()
  return t || null
}

function mapStatus(s) {
  const v = decodeHtml(String(s ?? '')).toLowerCase().trim()
  if (v === 'ativo') return 'ativo'
  if (v === 'inativo') return 'inativo'
  if (v === 'indisponível' || v === 'indisponivel') return 'indisponivel'
  return 'ativo'
}

function mapSex(s) {
  const v = decodeHtml(String(s ?? '')).toLowerCase().trim()
  if (v.startsWith('masc')) return 'masculino'
  if (v.startsWith('fem')) return 'feminino'
  return null
}

function mapCivilStatus(s) {
  const v = decodeHtml(String(s ?? '')).toLowerCase().trim()
  if (v.includes('solteir')) return 'solteiro'
  if (v.includes('casad')) return 'casado'
  if (v.includes('união') || v.includes('uniao')) return 'uniao_estavel'
  if (v.includes('divorc')) return 'divorciado'
  if (v.includes('viúv') || v.includes('viuv')) return 'viuvo'
  return null
}

// Extrai código do formato "453693#NOME" → { codigo: '453693', nome: 'NOME' }
function parseCodedName(s) {
  if (!s) return { codigo: null, nome: null }
  const decoded = decodeHtml(s)
  const m = decoded.match(/^(\d+)#(.+)$/)
  if (m) return { codigo: m[1], nome: m[2].trim() }
  return { codigo: null, nome: decoded.trim() || null }
}

// ─── Mapeamento de igrejas (cache do banco) ──────────────────────────────────

let CHURCH_CACHE = null
let CHURCH_FALLBACK = null  // sede pra casos sem match

async function loadChurches() {
  const { data, error } = await supabase.from('churches').select('id, name, type')
  if (error) throw error
  CHURCH_CACHE = data
  CHURCH_FALLBACK = data.find(c => c.type === 'sede')?.id
  if (!CHURCH_FALLBACK) throw new Error('Nenhuma igreja sede encontrada no banco')
  console.log(`  Igrejas no banco: ${data.length} (fallback: ${data.find(c => c.type === 'sede')?.name})`)
}

function normalizeChurchName(s) {
  return decodeHtml(String(s ?? ''))
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')  // remove acentos
    .replace(/\(sede\)|\(filial\)/g, '')
    .replace(/—|–|-/g, ' ')
    .replace(/^adp\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const unmatchedChurches = new Set()

function resolveChurch(name) {
  if (!name) return CHURCH_FALLBACK
  const norm = normalizeChurchName(name)
  if (!norm) return CHURCH_FALLBACK
  // tenta match exato pelo nome normalizado
  for (const c of CHURCH_CACHE) {
    const cNorm = normalizeChurchName(c.name)
    if (cNorm === norm) return c.id
    // match parcial: a igreja contém o nome normalizado, ou vice-versa
    if (cNorm.includes(norm) || norm.includes(cNorm)) return c.id
  }
  // não achou — sinaliza e usa fallback
  unmatchedChurches.add(name)
  return CHURCH_FALLBACK
}

// ─── Leitura de arquivos ──────────────────────────────────────────────────────

function readMembersFile() {
  const path = 'imports/BACKUP_Secretaria_Membros_Todos.xls'
  const buf = readFileSync(path)
  const wb = XLSX.read(buf, { cellDates: false, type: 'buffer' })
  const sheet = wb.Sheets['Sheet1']
  const matrix = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: false, header: 1 })
  // Linha 0 = header artificial "Backup — Secretaria/Membros: Todos"
  // Linha 1 = nomes reais das colunas (com HTML entities)
  // Linhas 2+ = dados
  const headerRaw = matrix[1]
  const header = headerRaw.map(decodeHtml)
  const dataRows = matrix.slice(2).filter(r => r && r.some(v => v !== null && v !== ''))
  return { header, headerRaw, dataRows, filename: path.replace('imports/', '') }
}

function readVisitantesFile() {
  const path = 'imports/Membros_2026-04-22.xlsx'
  const buf = readFileSync(path)
  const wb = XLSX.read(buf, { cellDates: false, type: 'buffer' })
  const sheet = wb.Sheets['Membros']
  const dataObjects = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: false })
  return { dataObjects, filename: path.replace('imports/', '') }
}

// ─── Construção do raw_data + membro real ─────────────────────────────────────

function buildRawDataFromMatrix(header, row) {
  const obj = {}
  header.forEach((h, i) => {
    if (h && row[i] !== null && row[i] !== undefined && row[i] !== '') {
      obj[h] = decodeHtml(row[i])
    }
  })
  return obj
}

function buildMemberFromMembrosRow(rawData, churchId) {
  const get = (k) => {
    const v = rawData[k]
    return v ? decodeHtml(v) : null
  }

  const cpf = cleanCPF(get('CPF'))
  const birthDate = parseDate(get('Data de nascimento'))

  // Concatena todos os históricos em notes
  const historicos = [
    'Histórico: Perfil',
    'Histórico: Contatos',
    'Histórico: Familiar',
    'Histórico: Ministerial',
    'Histórico: Administrativo',
    'Histórico: Controle',
  ]
  const notesParts = []
  for (const k of historicos) {
    const v = get(k)
    if (v) notesParts.push(`${k.replace('Histórico: ', '— ')}: ${v}`)
  }
  // Adiciona código auxiliar legado se houver
  const codAux = get('Código auxiliar')
  if (codAux) notesParts.push(`— Código legado: ${codAux}`)

  const notes = notesParts.length > 0 ? notesParts.join('\n\n') : null

  // Member core
  const member = {
    church_id: churchId,
    member_type: 'membro',
    status: mapStatus(get('Status')),
    name: get('Nome'),
    sex: mapSex(get('Sexo')),
    birth_date: birthDate,
    civil_status: mapCivilStatus(get('Estado civil')),
    nationality: get('Nacionalidade') ?? 'Brasil',
    naturalidade: get('Naturalidade'),
    cpf,
    identity: get('Identidade'),
    schooling: get('Escolaridade'),
    occupation: get('Profissão'),
    code: codAux,
    entry_date: parseDate(get('Data de entrada')),
    entry_reason: get('Motivo de entrada'),
    origin_church: get('Igreja de origem'),
    exit_date: parseDate(get('Data de saída')),
    exit_reason: get('Motivo de saída'),
    baptism: parseBR(get('Batizado nas águas')) ?? false,
    baptism_date: parseDate(get('Data de batismo nas águas')),
    baptism_spirit: parseBR(get('Batizado no Espírito')) ?? false,
    baptism_spirit_date: parseDate(get('Data de Batismo no Espírito')),
    conversion: parseBR(get('Convertido')) ?? false,
    conversion_date: parseDate(get('Data de conversão')),
    notes,
  }

  // Contacts
  const emails = [get('E-mail 1'), get('E-mail 2')].filter(Boolean)
  const phones = [get('Telefone 1'), get('Telefone 2'), get('Celular 1'), get('Celular 2')]
    .map(cleanPhone).filter(Boolean)

  const contacts = (emails.length || phones.length || get('CEP') || get('Endereço') || get('Cidade')) ? {
    emails: emails.length ? emails : null,
    phones: phones.length ? phones : null,
    cellphone1: cleanPhone(get('Celular 1')),
    cep: get('CEP'),
    address: get('Endereço'),
    number: get('Número'),
    complement: get('Complemento'),
    neighborhood: get('Bairro') || get('Sub-bairro'),
    city: get('Cidade'),
    state: get('Estado'),
    country: get('País') ?? 'Brasil',
  } : null

  // Family — guarda nome e código (resolve depois)
  const conjuge = parseCodedName(get('Nome do cônjuge'))
  const pai = parseCodedName(get('Nome do pai'))
  const mae = parseCodedName(get('Nome da mãe'))
  const family = (conjuge.nome || pai.nome || mae.nome || get('Data de casamento')) ? {
    spouse_name: conjuge.nome,
    wedding_date: parseDate(get('Data de casamento')),
    father_name: pai.nome,
    mother_name: mae.nome,
  } : null

  // Códigos legacy guardados em raw_data já — vão ser resolvidos na 2ª passada
  // Vamos guardar também explicitamente em metadata pra acelerar
  const legacyCodes = {
    spouse_legacy_code: conjuge.codigo,
    father_legacy_code: pai.codigo,
    mother_legacy_code: mae.codigo,
    self_legacy_code: codAux,
  }

  // Ministry
  const titulos = get('Títulos')
  const ministerios = get('Ministérios')
  const funcoes = get('Funções')
  const ministry = (titulos || ministerios || funcoes) ? {
    titles: titulos ? titulos.split(/[,;]\s*/).filter(Boolean) : [],
    ministries: ministerios ? ministerios.split(/[,;]\s*/).filter(Boolean) : [],
    functions: funcoes ? funcoes.split(/[,;]\s*/).filter(Boolean) : [],
    departments: [],
  } : null

  return { member, contacts, family, ministry, legacyCodes }
}

function buildMemberFromVisitanteRow(row, churchId) {
  const name = row['Nome']
  const phones = [cleanPhone(row['Celular 1'])].filter(Boolean)

  const member = {
    church_id: churchId,
    member_type: 'visitante',
    status: mapStatus(row['Status']),
    name,
    birth_date: parseDate(row['Data de nascimento']),
    civil_status: mapCivilStatus(row['Estado civil']),
  }

  const contacts = phones.length ? {
    phones,
    cellphone1: phones[0],
    country: 'Brasil',
  } : null

  const ministry = row['Título'] ? {
    titles: [row['Título']],
    ministries: [],
    functions: [],
    departments: [],
  } : null

  return { member, contacts, family: null, ministry, legacyCodes: { self_legacy_code: null } }
}

// ─── Detecção de duplicados ───────────────────────────────────────────────────

let EXISTING_MEMBERS = []  // cache do que já tá no banco

async function loadExistingMembers() {
  const { data, error } = await supabase
    .from('members')
    .select('id, name, birth_date, cpf, member_type')
    .neq('status', 'deleted')
  if (error) throw error
  EXISTING_MEMBERS = data
  console.log(`  Membros já existentes no banco: ${data.length}`)
}

function findDuplicate(member) {
  const cpf = member.cpf?.replace(/\D/g, '')
  if (cpf && cpf.length === 11) {
    const byCpf = EXISTING_MEMBERS.find(m => m.cpf?.replace(/\D/g, '') === cpf)
    if (byCpf) return { match: byCpf, method: 'cpf' }
  }
  if (member.name && member.birth_date) {
    const norm = member.name.toLowerCase().trim()
    const byNomeData = EXISTING_MEMBERS.find(m =>
      m.name?.toLowerCase().trim() === norm && m.birth_date === member.birth_date
    )
    if (byNomeData) return { match: byNomeData, method: 'nome+nascimento' }
  }
  return null
}

// ─── Inserção ────────────────────────────────────────────────────────────────

async function insertMemberStack(memberPayload, contacts, family, ministry, dryRun = false) {
  if (dryRun) return { id: 'DRY-RUN-' + Math.random().toString(36).slice(2), dry: true }

  const { data: m, error: e1 } = await supabase
    .from('members')
    .insert(memberPayload)
    .select('id')
    .single()
  if (e1) throw new Error(`members: ${e1.message}`)

  const memberId = m.id
  const ops = []

  if (contacts) {
    ops.push(supabase.from('member_contacts').upsert({ member_id: memberId, ...contacts }))
  }
  if (family) {
    ops.push(supabase.from('member_family').upsert({ member_id: memberId, ...family }))
  }
  if (ministry) {
    ops.push(supabase.from('member_ministry').upsert({ member_id: memberId, ...ministry }))
  }
  for (const op of ops) {
    const { error } = await op
    if (error) throw new Error(`relations: ${error.message}`)
  }

  EXISTING_MEMBERS.push({
    id: memberId,
    name: memberPayload.name,
    birth_date: memberPayload.birth_date,
    cpf: memberPayload.cpf,
    member_type: memberPayload.member_type,
  })

  return { id: memberId }
}

async function insertLegacyRaw(rawData, source, sourceFile, sourceSheet, sourceRow, status, matchMethod, notes, memberId, dryRun = false) {
  if (dryRun) return null
  // Inclui legacyCodes em raw_data como sub-objeto _legacy_codes
  const { error } = await supabase.from('members_legacy_raw').insert({
    member_id: memberId,
    source,
    source_file: sourceFile,
    source_sheet: sourceSheet,
    source_row: sourceRow,
    raw_data: rawData,
    status,
    match_method: matchMethod,
    notes,
  })
  if (error) throw new Error(`legacy_raw: ${error.message}`)
}

// ─── Pipeline principal ──────────────────────────────────────────────────────

async function processMembros(dryRun) {
  console.log('\n📁 Processando membros (BACKUP_Secretaria_Membros_Todos.xls)...')
  const { header, headerRaw, dataRows, filename } = readMembersFile()
  void headerRaw

  const stats = {
    total: dataRows.length,
    novos: 0,
    duplicados: 0,
    semNome: 0,
    erros: 0,
    erroDetalhes: [],
  }

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]
    const sourceRow = i + 3  // +1 header_artificial +1 header_real +1 zero-index
    const rawData = buildRawDataFromMatrix(header, row)

    if (!rawData['Nome']) {
      stats.semNome++
      await insertLegacyRaw(
        rawData, 'sistema_antigo_membros_2026_04', filename, 'Sheet1', sourceRow,
        'ignorado', null, 'Linha sem nome', null, dryRun,
      )
      continue
    }

    try {
      const churchId = resolveChurch(rawData['Igreja'])
      const built = buildMemberFromMembrosRow(rawData, churchId)
      const dup = findDuplicate(built.member)

      // Anexa códigos legacy ao raw_data pra facilitar passada 2
      rawData['_legacy_codes'] = built.legacyCodes

      let memberId, status, matchMethod, notes

      if (dup) {
        // mantém duplicado mas cria mesmo assim (decisão do usuário) e sinaliza
        const { id } = await insertMemberStack(built.member, built.contacts, built.family, built.ministry, dryRun)
        memberId = id
        status = 'duplicado'
        matchMethod = dup.method
        notes = `Duplicado por ${dup.method} com membro ${dup.match.id} (${dup.match.name})`
        stats.duplicados++
      } else {
        const { id } = await insertMemberStack(built.member, built.contacts, built.family, built.ministry, dryRun)
        memberId = id
        status = 'migrado'
        matchMethod = null
        notes = null
        stats.novos++
      }

      await insertLegacyRaw(
        rawData, 'sistema_antigo_membros_2026_04', filename, 'Sheet1', sourceRow,
        status, matchMethod, notes, memberId, dryRun,
      )
    } catch (err) {
      stats.erros++
      stats.erroDetalhes.push({ row: sourceRow, name: rawData['Nome'], error: err.message })
      await insertLegacyRaw(
        rawData, 'sistema_antigo_membros_2026_04', filename, 'Sheet1', sourceRow,
        'erro', null, err.message, null, dryRun,
      )
    }

    if ((i + 1) % 50 === 0) {
      process.stdout.write(`\r  Progresso: ${i + 1}/${dataRows.length}`)
    }
  }
  process.stdout.write(`\r  Progresso: ${dataRows.length}/${dataRows.length}\n`)
  return stats
}

async function processVisitantes(dryRun) {
  console.log('\n📁 Processando visitantes (Membros_2026-04-22.xlsx)...')
  const { dataObjects, filename } = readVisitantesFile()

  const stats = {
    total: dataObjects.length,
    novos: 0,
    duplicados: 0,
    semNome: 0,
    erros: 0,
    erroDetalhes: [],
  }

  for (let i = 0; i < dataObjects.length; i++) {
    const row = dataObjects[i]
    const sourceRow = i + 2  // +1 header +1 zero-index
    const rawData = { ...row }

    if (!rawData['Nome']) {
      stats.semNome++
      await insertLegacyRaw(
        rawData, 'sistema_antigo_visitantes_2026_04', filename, 'Membros', sourceRow,
        'ignorado', null, 'Linha sem nome', null, dryRun,
      )
      continue
    }

    try {
      const churchId = resolveChurch(rawData['Igreja'])
      const built = buildMemberFromVisitanteRow(rawData, churchId)
      const dup = findDuplicate(built.member)

      let memberId, status, matchMethod, notes

      if (dup) {
        // se já existe como membro, NÃO cria visitante separado (decisão: prevalece membro)
        memberId = dup.match.id
        status = 'duplicado'
        matchMethod = dup.method
        notes = `Já existe como ${dup.match.member_type} (id ${dup.match.id}). Visitante não foi criado separadamente.`
        stats.duplicados++
      } else {
        const { id } = await insertMemberStack(built.member, built.contacts, built.family, built.ministry, dryRun)
        memberId = id
        status = 'migrado'
        matchMethod = null
        notes = null
        stats.novos++
      }

      await insertLegacyRaw(
        rawData, 'sistema_antigo_visitantes_2026_04', filename, 'Membros', sourceRow,
        status, matchMethod, notes, memberId, dryRun,
      )
    } catch (err) {
      stats.erros++
      stats.erroDetalhes.push({ row: sourceRow, name: rawData['Nome'], error: err.message })
      await insertLegacyRaw(
        rawData, 'sistema_antigo_visitantes_2026_04', filename, 'Membros', sourceRow,
        'erro', null, err.message, null, dryRun,
      )
    }
  }
  return stats
}

async function main() {
  console.log('='.repeat(70))
  console.log(`  IMPORTAÇÃO DE MEMBROS DO SISTEMA ANTIGO ${DRY_RUN ? '(DRY-RUN)' : ''}`)
  console.log('='.repeat(70))

  console.log('\n🔌 Conectando ao Supabase...')
  await loadChurches()
  await loadExistingMembers()

  const t0 = Date.now()

  const membrosStats = await processMembros(DRY_RUN)
  const visitantesStats = await processVisitantes(DRY_RUN)

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)

  console.log('\n' + '='.repeat(70))
  console.log('  RESULTADO')
  console.log('='.repeat(70))

  console.log('\n📊 Membros:')
  console.log(`  Total no arquivo:      ${membrosStats.total}`)
  console.log(`  Novos cadastrados:     ${membrosStats.novos}`)
  console.log(`  Duplicados (mantidos): ${membrosStats.duplicados}`)
  console.log(`  Linhas sem nome:       ${membrosStats.semNome}`)
  console.log(`  Erros:                 ${membrosStats.erros}`)

  console.log('\n📊 Visitantes:')
  console.log(`  Total no arquivo:      ${visitantesStats.total}`)
  console.log(`  Novos cadastrados:     ${visitantesStats.novos}`)
  console.log(`  Já existem como membro: ${visitantesStats.duplicados} (não duplicados)`)
  console.log(`  Linhas sem nome:       ${visitantesStats.semNome}`)
  console.log(`  Erros:                 ${visitantesStats.erros}`)

  if (unmatchedChurches.size > 0) {
    console.log('\n⚠️  Igrejas não mapeadas (foram pra Sede como fallback):')
    for (const c of unmatchedChurches) console.log(`     - "${c}"`)
  }

  if (membrosStats.erros > 0 || visitantesStats.erros > 0) {
    console.log('\n❌ Detalhes dos erros:')
    for (const e of [...membrosStats.erroDetalhes, ...visitantesStats.erroDetalhes].slice(0, 20)) {
      console.log(`   linha ${e.row} "${e.name}": ${e.error}`)
    }
    if (membrosStats.erroDetalhes.length + visitantesStats.erroDetalhes.length > 20) {
      console.log(`   ... e mais ${membrosStats.erroDetalhes.length + visitantesStats.erroDetalhes.length - 20} erros`)
    }
  }

  console.log(`\n⏱️  Tempo total: ${elapsed}s`)

  if (DRY_RUN) {
    console.log('\n🧪 DRY-RUN: Nenhum dado foi inserido no banco.')
    console.log('   Pra rodar de verdade: node scripts/migration/import-legacy.mjs')
  } else {
    console.log('\n✅ Importação concluída.')
    console.log('   Próximo passo: rodar scripts/migration/resolve-family-links.mjs')
    console.log('   pra criar vínculos de cônjuge/pai/mãe via UUID (passada 2).')
  }
}

main().catch(e => {
  console.error('\n💥 Erro fatal:', e.message)
  console.error(e.stack)
  process.exit(1)
})
