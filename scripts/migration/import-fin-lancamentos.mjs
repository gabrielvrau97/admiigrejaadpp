/**
 * Importação de lançamentos financeiros → Supabase
 *
 * Uso:
 *   node scripts/migration/import-fin-lancamentos.mjs --dry-run   # simula
 *   node scripts/migration/import-fin-lancamentos.mjs             # importa
 *   node scripts/migration/import-fin-lancamentos.mjs --force     # reimporta (cuidado!)
 *   node scripts/migration/import-fin-lancamentos.mjs --rollback  # desfaz importação
 *
 * Arquivos esperados em imports/financeiro/:
 *   - BACKUP_Financeiro_Receitas_2025.xls  → entrada, status='Confirmado'
 *   - BACKUP_Financeiro_Receitas_2026.xls  → entrada, status='Confirmado'
 *   - BACKUP_Financeiro_Despesas_2025.xls  → saida,   status='Pago'
 *   - BACKUP_Financeiro_Despesas_2026.xls  → saida,   status='Pago'
 *
 * Garantias:
 *   - Reaproveita categorias existentes (não duplica Dízimo, Renda, Outros, etc.)
 *   - Mapeia "Oferta" → "Oferta Geral" e "Sede" → "ADP Piracanjuba — Sede"
 *   - Casa Provedor com membro via nome normalizado (sem acento, caixa baixa)
 *   - Marca fornecedores criados com observacao='IMPORT_LEGACY' para rollback
 *   - Marca lançamentos com origem='importado' para rollback
 *   - Valor em centavos no Excel → reais no banco (divide por 100)
 *   - Verifica duplicatas antes de inserir (a menos que --force)
 */

import * as XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { writeFileSync, readFileSync } from 'fs'

config()

const DRY_RUN  = process.argv.includes('--dry-run')
const FORCE    = process.argv.includes('--force')
const ROLLBACK = process.argv.includes('--rollback')

const SUPABASE_URL          = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error('❌ Faltam variáveis no .env: VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const FORN_IMPORT_TAG = 'IMPORT_LEGACY'

// ─── Configuração dos arquivos ────────────────────────────────────────────────

const ARQUIVOS = [
  { path: 'imports/financeiro/BACKUP_Financeiro_Receitas_2025.xls', tipo: 'entrada', statusValido: 'Confirmado' },
  { path: 'imports/financeiro/BACKUP_Financeiro_Receitas_2026.xls', tipo: 'entrada', statusValido: 'Confirmado' },
  { path: 'imports/financeiro/BACKUP_Financeiro_Despesas_2025.xls', tipo: 'saida',   statusValido: 'Pago'       },
  { path: 'imports/financeiro/BACKUP_Financeiro_Despesas_2026.xls', tipo: 'saida',   statusValido: 'Pago'       },
]

// ─── Mapeamento de categorias (Excel → Banco) ─────────────────────────────────
// Chave: nome normalizado do Excel | Valor: nome canônico (caso exato no banco)
const MAPA_CAT_ENTRADA = {
  'parceiro fiel':         'Parceiro Fiel',
  'dizimo':                'Dízimo',                // já existe
  'oferta':                'Oferta Geral',          // já existe (renomeado)
  'anuidade ministros':    'Anuidade Ministros',
  'revistas da ebd':       'Revistas da EBD',
  'repasse congregacoes':  'Repasse Congregações',
  'renda':                 'Renda',                 // já existe
  'oferta ebd':            'Oferta EBD',
  'repasse departamentos': 'Repasse Departamentos',
}

const MAPA_CAT_SAIDA = {
  'combustivel':                    'Combustível',                  // já existe
  'consumo/alimentacao':            'Consumo/Alimentação',
  'materiais':                      'Material',                     // já existe (renomeado)
  'agua/luz/telefone':              'Conta Fixa',                   // já existe (mapeado)
  'servico':                        'Serviços',                     // já existe
  'internet':                       'Internet',
  'prebenda':                       'Prebenda',
  'ajuda a congregacoes':           'Ajuda a Congregações',
  'taxa bancaria':                  'Taxa Bancária',
  'emprestimos':                    'Empréstimos (Saída)',
  'manutencao':                     'Manutenção',
  'outros':                         'Outros',                       // já existe (saida)
  'aluguel':                        'Aluguel',
  'imoveis':                        'Imóveis',
  'seguro':                         'Seguro',
  'alimentacao':                    'Alimentação',
  'moveis/utencilios/equipamentos': 'Móveis/Utensílios/Equipamentos',
  'seguranca':                      'Segurança',
  'evento':                         'Evento',
  'assistencia':                    'Ajuda Social',                 // já existe (mapeado)
  'construcao':                     'Construção',
  'impostos':                       'Impostos',
  'ajuda departamento':             'Ajuda Departamento',
  'auxilio':                        'Auxílio',
  'escritorio':                     'Escritório',
  'doacao':                         'Doação',
  'gratificacao':                   'Gratificação',
  'saude':                          'Saúde',
}

// Categorias a criar se não existirem (com cor padrão)
const CATEGORIAS_NOVAS = {
  // entrada
  'Parceiro Fiel':                  { tipo: 'entrada', cor: '#8b5cf6' },
  'Anuidade Ministros':             { tipo: 'entrada', cor: '#f59e0b' },
  'Revistas da EBD':                { tipo: 'entrada', cor: '#ec4899' },
  'Repasse Congregações':           { tipo: 'entrada', cor: '#06b6d4' },
  'Oferta EBD':                     { tipo: 'entrada', cor: '#f97316' },
  'Repasse Departamentos':          { tipo: 'entrada', cor: '#6366f1' },
  // saida
  'Consumo/Alimentação':            { tipo: 'saida',   cor: '#f97316' },
  'Internet':                       { tipo: 'saida',   cor: '#3b82f6' },
  'Prebenda':                       { tipo: 'saida',   cor: '#10b981' },
  'Ajuda a Congregações':           { tipo: 'saida',   cor: '#ec4899' },
  'Taxa Bancária':                  { tipo: 'saida',   cor: '#6366f1' },
  'Empréstimos (Saída)':            { tipo: 'saida',   cor: '#dc2626' },
  'Manutenção':                     { tipo: 'saida',   cor: '#d97706' },
  'Aluguel':                        { tipo: 'saida',   cor: '#7c3aed' },
  'Imóveis':                        { tipo: 'saida',   cor: '#b45309' },
  'Seguro':                         { tipo: 'saida',   cor: '#0891b2' },
  'Alimentação':                    { tipo: 'saida',   cor: '#ca8a04' },
  'Móveis/Utensílios/Equipamentos': { tipo: 'saida',   cor: '#9f1239' },
  'Segurança':                      { tipo: 'saida',   cor: '#1d4ed8' },
  'Evento':                         { tipo: 'saida',   cor: '#be185d' },
  'Construção':                     { tipo: 'saida',   cor: '#92400e' },
  'Impostos':                       { tipo: 'saida',   cor: '#374151' },
  'Ajuda Departamento':             { tipo: 'saida',   cor: '#5b21b6' },
  'Auxílio':                        { tipo: 'saida',   cor: '#065f46' },
  'Escritório':                     { tipo: 'saida',   cor: '#1e3a5f' },
  'Doação':                         { tipo: 'saida',   cor: '#7f1d1d' },
  'Gratificação':                   { tipo: 'saida',   cor: '#4c1d95' },
  'Saúde':                          { tipo: 'saida',   cor: '#14532d' },
}

// Mapeamento de igrejas (Excel → Banco)
const MAPA_IGREJA = {
  'sede':                        'adp piracanjuba — sede',
  'adp bela vista (filial)':     'adp bela vista',
  'adp areia (filial)':          'adp areia',
  'adp trevo floresta (filial)': 'adp trevo floresta',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const HTML_ENTITIES = {
  '&mdash;': '-', '&amp;': '&', '&nbsp;': ' ', '&quot;': '"', '&apos;': "'",
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
}

function decodeHtml(s) {
  if (s === null || s === undefined) return ''
  if (typeof s !== 'string') s = String(s)
  return s.replace(/&[a-zA-Z#]+;/g, m => HTML_ENTITIES[m] ?? m).trim()
}

function excelToISO(val) {
  if (typeof val === 'number' && !isNaN(val)) {
    const utcDays = Math.floor(val - 25569)
    return new Date(utcDays * 86400 * 1000).toISOString().split('T')[0]
  }
  if (typeof val === 'string' && val.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    const [d, m, y] = val.split('/')
    return `${y}-${m}-${d}`
  }
  return null
}

function norm(s) {
  if (!s) return ''
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim()
}

async function batchInsert(table, rows, size = 200, returning = false) {
  let inseridos = 0
  const all = []
  for (let i = 0; i < rows.length; i += size) {
    const lote = rows.slice(i, i + size)
    const q = supabase.from(table).insert(lote)
    const { data, error } = returning ? await q.select() : await q
    if (error) throw new Error(`Erro no lote ${i}-${i + size} em ${table}: ${error.message}`)
    if (data) all.push(...data)
    inseridos += lote.length
    process.stdout.write(`\r  Inseridos ${inseridos}/${rows.length}...`)
  }
  console.log()
  return returning ? all : inseridos
}

function lerArquivo(cfg) {
  const buf = readFileSync(cfg.path)
  const wb = XLSX.read(buf, { cellDates: false, type: 'buffer' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  const headers = matrix[1].map(h => decodeHtml(String(h)))
  const rows = []
  for (let i = 2; i < matrix.length; i++) {
    const row = { _tipo: cfg.tipo, _statusValido: cfg.statusValido }
    headers.forEach((h, j) => { row[h] = matrix[i][j] })
    rows.push(row)
  }
  console.log(`  📄 ${cfg.path.split(/[/\\]/).pop()}: ${rows.length} linhas`)
  return rows
}

// ─── ROLLBACK ─────────────────────────────────────────────────────────────────

async function rollback() {
  console.log('\n🔄 ROLLBACK — desfazendo importação\n')

  const { data: grupos } = await supabase.from('church_groups').select('id, name')
  const grupo = grupos[0]

  // Conta antes
  const { count: cLanc } = await supabase.from('fin_lancamentos')
    .select('id', { count: 'exact', head: true })
    .eq('origem', 'importado').eq('church_group_id', grupo.id)
  const { count: cForn } = await supabase.from('fin_fornecedores')
    .select('id', { count: 'exact', head: true })
    .eq('observacao', FORN_IMPORT_TAG).eq('church_group_id', grupo.id)

  console.log(`  Lançamentos importados a remover: ${cLanc || 0}`)
  console.log(`  Fornecedores importados a remover: ${cForn || 0}`)

  if (!cLanc && !cForn) {
    console.log('\n  Nada a remover. ✅')
    return
  }

  // Deleta lançamentos importados
  const { error: errL } = await supabase.from('fin_lancamentos')
    .delete().eq('origem', 'importado').eq('church_group_id', grupo.id)
  if (errL) throw new Error('Erro deletando lançamentos: ' + errL.message)
  console.log(`  ✅ ${cLanc} lançamentos removidos`)

  // Deleta fornecedores criados pelo import
  const { error: errF } = await supabase.from('fin_fornecedores')
    .delete().eq('observacao', FORN_IMPORT_TAG).eq('church_group_id', grupo.id)
  if (errF) throw new Error('Erro deletando fornecedores: ' + errF.message)
  console.log(`  ✅ ${cForn} fornecedores removidos`)

  console.log('\n✅ Rollback concluído.')
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  if (ROLLBACK) {
    await rollback()
    return
  }

  console.log(`\n🚀 Importação ${DRY_RUN ? '[DRY-RUN]' : FORCE ? '[FORCE]' : '[REAL]'}\n`)

  // ── 1. Lê arquivos ─────────────────────────────────────────────────────────
  console.log('📂 Lendo arquivos...')
  const todasLinhas = ARQUIVOS.flatMap(lerArquivo)
  console.log(`  Total bruto: ${todasLinhas.length} linhas`)

  // ── 2. Filtra ──────────────────────────────────────────────────────────────
  const validas = todasLinhas.filter(r => {
    const status = decodeHtml(String(r['Status'] || ''))
    return status === r._statusValido
  })
  console.log(`  Confirmado/Pago: ${validas.length} | Pulados: ${todasLinhas.length - validas.length}`)

  // ── 3. Carrega dados do banco ──────────────────────────────────────────────
  console.log('\n🔍 Buscando dados do Supabase...')

  const { data: grupos } = await supabase.from('church_groups').select('id, name')
  const grupo = grupos[0]
  console.log(`  Grupo: ${grupo.name}`)

  const { data: igrejas } = await supabase.from('churches').select('id, name').eq('group_id', grupo.id)
  const mapaIgreja = {}
  igrejas.forEach(c => { mapaIgreja[norm(c.name)] = c.id })

  function resolveIgreja(nomeExcel) {
    const n = norm(nomeExcel)
    const destino = MAPA_IGREJA[n]
    if (destino && mapaIgreja[destino]) return mapaIgreja[destino]
    if (mapaIgreja[n]) return mapaIgreja[n]
    return mapaIgreja[norm('ADP Piracanjuba — Sede')] || Object.values(mapaIgreja)[0]
  }

  // Categorias: separadas por tipo
  const { data: categoriasDB } = await supabase
    .from('fin_categorias').select('id, nome, tipo').eq('church_group_id', grupo.id)
  const mapaCat = { entrada: {}, saida: {} }
  categoriasDB.forEach(c => { mapaCat[c.tipo][norm(c.nome)] = c.id })
  console.log(`  Categorias existentes: ${categoriasDB.length}`)

  const { data: membros, error: errM } = await supabase.from('members').select('id, name, apelido')
  if (errM) throw new Error('Erro buscar members: ' + errM.message)
  const mapaMembro = {}
  membros.forEach(m => {
    if (m.name) mapaMembro[norm(m.name)] = m.id
    if (m.apelido) mapaMembro[norm(m.apelido)] = m.id
  })
  console.log(`  Membros no banco: ${membros.length}`)

  const { data: fornecedoresDB } = await supabase
    .from('fin_fornecedores').select('id, nome').eq('church_group_id', grupo.id)
  const mapaForn = {}
  fornecedoresDB.forEach(f => { mapaForn[norm(f.nome)] = f.id })
  console.log(`  Fornecedores existentes: ${fornecedoresDB.length}`)

  const { data: masterUsers } = await supabase.from('app_users').select('id, email')
    .eq('role', 'master').eq('church_group_id', grupo.id).limit(1)
  if (!masterUsers?.length) throw new Error('Nenhum master no grupo')
  const masterId = masterUsers[0].id
  console.log(`  Master usado: ${masterUsers[0].email}`)

  // ── 4. Verifica duplicatas antes de tudo ──────────────────────────────────
  const { count: jaImportados } = await supabase.from('fin_lancamentos')
    .select('id', { count: 'exact', head: true })
    .eq('origem', 'importado').eq('church_group_id', grupo.id)

  if (jaImportados > 0 && !FORCE && !DRY_RUN) {
    console.log(`\n⚠️  Já existem ${jaImportados} lançamentos com origem='importado'.`)
    console.log('   Use --rollback para desfazer ou --force para duplicar.')
    process.exit(0)
  }

  // ── 5. Cria categorias faltantes ───────────────────────────────────────────
  console.log('\n📋 Verificando categorias...')
  const novasCats = []
  for (const [nome, meta] of Object.entries(CATEGORIAS_NOVAS)) {
    if (!mapaCat[meta.tipo][norm(nome)]) {
      novasCats.push({ ...meta, nome, church_group_id: grupo.id })
    }
  }

  if (novasCats.length > 0) {
    console.log(`  + ${novasCats.length} categorias novas`)
    novasCats.forEach(c => console.log(`    - ${c.tipo}: ${c.nome}`))
    if (!DRY_RUN) {
      const { data: criadas, error } = await supabase.from('fin_categorias').insert(novasCats).select('id, nome, tipo')
      if (error) throw new Error('Erro criar categorias: ' + error.message)
      criadas.forEach(c => { mapaCat[c.tipo][norm(c.nome)] = c.id })
      console.log(`  ✅ ${criadas.length} categorias criadas`)
    } else {
      novasCats.forEach(c => { mapaCat[c.tipo][norm(c.nome)] = 'dry-run-id' })
    }
  } else {
    console.log('  ✅ Todas as categorias necessárias já existem')
  }

  // ── 6. Cria fornecedores (despesas) ────────────────────────────────────────
  console.log('\n🏢 Verificando fornecedores...')
  const despesas = validas.filter(r => r._tipo === 'saida')
  const nomesForns = new Set(
    despesas.map(r => decodeHtml(String(r['Fornecedor'] || ''))).filter(Boolean)
  )
  const novosFornNomes = [...nomesForns].filter(n => !mapaForn[norm(n)])

  if (novosFornNomes.length > 0) {
    console.log(`  + ${novosFornNomes.length} fornecedores novos`)
    const fornObjs = novosFornNomes.map(nome => ({
      church_group_id: grupo.id,
      nome,
      ativo: true,
      observacao: FORN_IMPORT_TAG,
    }))
    if (!DRY_RUN) {
      const criados = await batchInsert('fin_fornecedores', fornObjs, 200, true)
      criados.forEach(f => { mapaForn[norm(f.nome)] = f.id })
      console.log(`  ✅ ${criados.length} fornecedores criados (tag: ${FORN_IMPORT_TAG})`)
    } else {
      novosFornNomes.forEach(n => { mapaForn[norm(n)] = 'dry-run-id' })
    }
  } else {
    console.log('  ✅ Nenhum fornecedor novo')
  }

  // ── 7. Monta lançamentos ───────────────────────────────────────────────────
  console.log('\n⚙️  Montando lançamentos...')

  const lancamentos = []
  const nomesSemMatchMember = {}
  const catsSemMatch = new Set()
  const igrejasSemMatch = new Set()

  for (const row of validas) {
    const isEntrada = row._tipo === 'entrada'

    // Data
    const campoData = isEntrada
      ? row['Data']
      : (row['Data de pagamento'] || row['Data de vencimento'])
    const dataISO = excelToISO(campoData) || new Date().toISOString().split('T')[0]

    // Igreja
    const nomeIgreja = decodeHtml(String(row['Igreja'] || ''))
    const churchId = resolveIgreja(nomeIgreja)
    if (!churchId) igrejasSemMatch.add(nomeIgreja)

    // Categoria (por tipo!)
    const nomeOrigCat = decodeHtml(String(row['Categoria'] || ''))
    const mapaTipo = isEntrada ? MAPA_CAT_ENTRADA : MAPA_CAT_SAIDA
    const nomeCanonico = mapaTipo[norm(nomeOrigCat)] || null
    const categoriaId = nomeCanonico ? (mapaCat[row._tipo][norm(nomeCanonico)] || null) : null
    if (nomeOrigCat && !categoriaId) catsSemMatch.add(`${row._tipo}: ${nomeOrigCat}`)

    // Valor (centavos → reais)
    const valorBruto = parseFloat(row['Valor']) || 0
    const valorReais = Math.round(Math.abs(valorBruto)) / 100
    if (valorReais <= 0) continue // não importa lançamentos zerados

    const referencia = decodeHtml(String(row['Referência'] || ''))

    if (isEntrada) {
      const nomeProvedor = decodeHtml(String(row['Provedor'] || ''))
      const vinculo      = decodeHtml(String(row['Vínculo'] || ''))
      const forma        = decodeHtml(String(row['Forma'] || ''))

      let memberId = null
      let memberNomeManual = null

      if ((vinculo === 'Pessoa/Membro' || vinculo === 'Membro') && nomeProvedor) {
        memberId = mapaMembro[norm(nomeProvedor)] || null
        if (!memberId) {
          memberNomeManual = nomeProvedor
          nomesSemMatchMember[nomeProvedor] = (nomesSemMatchMember[nomeProvedor] || 0) + 1
        }
      } else {
        memberNomeManual = nomeProvedor || null
      }

      lancamentos.push({
        church_group_id:    grupo.id,
        church_id:          churchId,
        tipo:               'entrada',
        categoria_id:       categoriaId,
        fornecedor_id:      null,
        member_id:          memberId,
        member_nome_manual: memberNomeManual,
        valor:              valorReais,
        descricao:          nomeOrigCat || null,
        referencia_culto:   null,
        data_lancamento:    dataISO,
        origem:             'importado',
        periodo_referencia: referencia || null,
        created_by:         masterId,
        observacao:         forma || null,
      })
    } else {
      const nomeForn  = decodeHtml(String(row['Fornecedor'] || ''))
      const descricao = decodeHtml(String(row['Descrição'] || ''))
      const recurso   = decodeHtml(String(row['Recurso'] || ''))
      const notaFisc  = decodeHtml(String(row['Nota fiscal'] || ''))
      const fornecedorId = nomeForn ? (mapaForn[norm(nomeForn)] || null) : null
      const obs = [recurso, notaFisc ? `NF: ${notaFisc}` : null].filter(Boolean).join(' | ') || null

      lancamentos.push({
        church_group_id:    grupo.id,
        church_id:          churchId,
        tipo:               'saida',
        categoria_id:       categoriaId,
        fornecedor_id:      fornecedorId,
        member_id:          null,
        member_nome_manual: nomeForn && !fornecedorId ? nomeForn : null,
        valor:              valorReais,
        descricao:          descricao || nomeOrigCat || null,
        referencia_culto:   null,
        data_lancamento:    dataISO,
        origem:             'importado',
        periodo_referencia: referencia || null,
        created_by:         masterId,
        observacao:         obs,
      })
    }
  }

  // ── 8. Relatório ───────────────────────────────────────────────────────────
  const entradas = lancamentos.filter(l => l.tipo === 'entrada')
  const saidas   = lancamentos.filter(l => l.tipo === 'saida')
  const totalE   = entradas.reduce((s, l) => s + l.valor, 0)
  const totalS   = saidas.reduce((s, l) => s + l.valor, 0)

  console.log(`\n📊 Resumo:`)
  console.log(`  Entradas: ${entradas.length} | R$ ${totalE.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
  console.log(`  Saídas:   ${saidas.length} | R$ ${totalS.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
  console.log(`  Saldo:    R$ ${(totalE - totalS).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
  console.log(`  Total:    ${lancamentos.length} lançamentos`)

  const matchados = entradas.filter(l => l.member_id).length
  const manual    = entradas.filter(l => !l.member_id && l.member_nome_manual).length
  const pctMatch  = entradas.length > 0 ? ((matchados / entradas.length) * 100).toFixed(1) : 0
  console.log(`  Entradas vinculadas a membros: ${matchados} (${pctMatch}%)`)
  console.log(`  Entradas com nome manual: ${manual}`)

  const semCat = lancamentos.filter(l => !l.categoria_id).length
  console.log(`  Lançamentos sem categoria: ${semCat}`)

  if (catsSemMatch.size > 0) {
    console.log(`\n⚠️  Categorias sem mapeamento:`)
    catsSemMatch.forEach(c => console.log(`    - ${c}`))
  }

  if (igrejasSemMatch.size > 0) {
    console.log(`\n⚠️  Igrejas sem match:`)
    igrejasSemMatch.forEach(i => console.log(`    - ${i}`))
  }

  // Salva relatório de provedores sem match para revisão manual
  const semMatchOrdenado = Object.entries(nomesSemMatchMember)
    .sort((a, b) => b[1] - a[1])
    .map(([nome, qtd]) => ({ nome, ocorrencias: qtd }))

  if (semMatchOrdenado.length > 0) {
    const relatorio = {
      data_geracao: new Date().toISOString(),
      total_sem_match: semMatchOrdenado.length,
      provedores: semMatchOrdenado,
    }
    writeFileSync(
      'imports/financeiro/provedores-sem-match.json',
      JSON.stringify(relatorio, null, 2),
      'utf8'
    )
    console.log(`\n📝 Salvou ${semMatchOrdenado.length} provedores sem match em:`)
    console.log(`   imports/financeiro/provedores-sem-match.json`)
    console.log(`   (top 10): ${semMatchOrdenado.slice(0, 10).map(p => p.nome).join(', ')}...`)
  }

  // ── 9. Inserção ────────────────────────────────────────────────────────────
  if (DRY_RUN) {
    console.log('\n✅ [DRY-RUN] Simulação concluída. Nada foi inserido.')
    console.log('   Execute sem --dry-run para importar de verdade.')
    return
  }

  console.log('\n💾 Inserindo lançamentos...')
  const total = await batchInsert('fin_lancamentos', lancamentos, 200)
  console.log(`\n✅ Importação concluída! ${total} lançamentos inseridos.`)
  console.log(`   Em caso de problema: node scripts/migration/import-fin-lancamentos.mjs --rollback`)
}

main().catch(err => {
  console.error('\n❌ Erro fatal:', err.message)
  console.error(err.stack)
  process.exit(1)
})
