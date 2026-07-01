/**
 * Importação de lançamentos financeiros via PDF (Igreja Digital) → Supabase
 *
 * Uso:
 *   node scripts/migration/import-fin-pdf-2026.mjs --dry-run
 *   node scripts/migration/import-fin-pdf-2026.mjs
 *   node scripts/migration/import-fin-pdf-2026.mjs --force
 *   node scripts/migration/import-fin-pdf-2026.mjs --rollback
 *   node scripts/migration/import-fin-pdf-2026.mjs --inspect    # mostra texto bruto do PDF
 *
 * Arquivos esperados em imports/financeiro/:
 *   - "entrada 2026.pdf"  → receitas confirmadas 2026
 *   - "saida 2026.pdf"    → despesas pagas 2026
 *
 * Diferenças do script XLS:
 *   - Valores já em REAIS (não centavos) — formato "1.234,56"
 *   - Datas em DD/MM/YYYY string
 *   - Parser por linha ancorando em padrão de data
 */

import { createRequire } from 'module'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { readFileSync, writeFileSync, existsSync } from 'fs'

config()

const require = createRequire(import.meta.url)
const _pdfMod = require('pdf-parse')
const pdfParse = _pdfMod.default || _pdfMod

// ─── Flags ────────────────────────────────────────────────────────────────────

const DRY_RUN  = process.argv.includes('--dry-run')
const FORCE    = process.argv.includes('--force')
const ROLLBACK = process.argv.includes('--rollback')
const INSPECT  = process.argv.includes('--inspect')

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

// ─── Arquivos ─────────────────────────────────────────────────────────────────

const PDF_ENTRADA = 'imports/financeiro/entrada 2026.pdf'
const PDF_SAIDA   = 'imports/financeiro/saida 2026.pdf'

// ─── Mapeamento de categorias ─────────────────────────────────────────────────
// Idêntico ao script XLS — reutiliza os mesmos mapeamentos

const MAPA_CAT_ENTRADA = {
  'parceiro fiel':         'Parceiro Fiel',
  'dizimo':                'Dízimo',
  'oferta':                'Oferta Geral',
  'oferta geral':          'Oferta Geral',
  'anuidade ministros':    'Anuidade Ministros',
  'revistas da ebd':       'Revistas da EBD',
  'repasse congregacoes':  'Repasse Congregações',
  'renda':                 'Renda',
  'oferta ebd':            'Oferta EBD',
  'repasse departamentos': 'Repasse Departamentos',
  'campanha':              'Campanha',
  'outros':                'Outros',
}

const MAPA_CAT_SAIDA = {
  'combustivel':                    'Combustível',
  'consumo/alimentacao':            'Consumo/Alimentação',
  'consumo':                        'Consumo/Alimentação',
  'alimentacao':                    'Alimentação',
  'materiais':                      'Material',
  'material':                       'Material',
  'agua/luz/telefone':              'Conta Fixa',
  'conta fixa':                     'Conta Fixa',
  'servico':                        'Serviços',
  'servicos':                       'Serviços',
  'internet':                       'Internet',
  'prebenda':                       'Prebenda',
  'ajuda a congregacoes':           'Ajuda a Congregações',
  'taxa bancaria':                  'Taxa Bancária',
  'emprestimos':                    'Empréstimos (Saída)',
  'manutencao':                     'Manutenção',
  'outros':                         'Outros',
  'aluguel':                        'Aluguel',
  'imoveis':                        'Imóveis',
  'seguro':                         'Seguro',
  'moveis/utencilios/equipamentos': 'Móveis/Utensílios/Equipamentos',
  'seguranca':                      'Segurança',
  'evento':                         'Evento',
  'assistencia':                    'Ajuda Social',
  'ajuda social':                   'Ajuda Social',
  'construcao':                     'Construção',
  'impostos':                       'Impostos',
  'ajuda departamento':             'Ajuda Departamento',
  'auxilio':                        'Auxílio',
  'escritorio':                     'Escritório',
  'doacao':                         'Doação',
  'gratificacao':                   'Gratificação',
  'saude':                          'Saúde',
}

const CATEGORIAS_NOVAS = {
  'Parceiro Fiel':                  { tipo: 'entrada', cor: '#8b5cf6' },
  'Anuidade Ministros':             { tipo: 'entrada', cor: '#f59e0b' },
  'Revistas da EBD':                { tipo: 'entrada', cor: '#ec4899' },
  'Repasse Congregações':           { tipo: 'entrada', cor: '#06b6d4' },
  'Oferta EBD':                     { tipo: 'entrada', cor: '#f97316' },
  'Repasse Departamentos':          { tipo: 'entrada', cor: '#6366f1' },
  'Renda':                          { tipo: 'entrada', cor: '#22c55e' },
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
  'Serviços':                       { tipo: 'saida',   cor: '#475569' },
}

const MAPA_IGREJA = {
  'sede':                        'adp piracanjuba — sede',
  'adp piracanjuba':             'adp piracanjuba — sede',
  'adp piracanjuba - sede':      'adp piracanjuba — sede',
  'adp piracanjuba — sede':      'adp piracanjuba — sede',
  'adp bela vista (filial)':     'adp bela vista',
  'adp bela vista':              'adp bela vista',
  'adp areia (filial)':          'adp areia',
  'adp areia':                   'adp areia',
  'adp trevo floresta (filial)': 'adp trevo floresta',
  'adp trevo floresta':          'adp trevo floresta',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function norm(s) {
  if (!s) return ''
  return String(s)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim()
}

/** "1.234,56" → 1234.56 */
function parseBRL(s) {
  if (!s) return 0
  const clean = String(s).replace(/\./g, '').replace(',', '.')
  const val = parseFloat(clean)
  return isNaN(val) ? 0 : val
}

/** "05/01/2026" → "2026-01-05" */
function parseDateBR(s) {
  if (!s) return null
  const m = String(s).match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return null
  return `${m[3]}-${m[2]}-${m[1]}`
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

// ─── Parser de PDF ────────────────────────────────────────────────────────────

const RE_DATE = /^\d{2}\/\d{2}\/\d{4}$/
const RE_BRL  = /^\d{1,3}(?:\.\d{3})*,\d{2}$/

/**
 * Extrai texto bruto do PDF, limpa espaços extras,
 * e retorna array de linhas não-vazias.
 */
async function extrairLinhas(caminho) {
  const buf = readFileSync(caminho)
  const { text } = await pdfParse(buf)
  return text
    .split('\n')
    .map(l => l.replace(/\s{2,}/g, '\t').trim())
    .filter(l => l.length > 0)
}

/**
 * Entrada PDF — colunas esperadas (separadas por tabulação após extração):
 * Data | Provedor | Categoria | Forma | Valor | Referência | [status] | Igreja
 *
 * Estratégia: linha começa com DD/MM/YYYY e contém um valor BRL.
 * Tudo entre data e valor vai sendo acumulado como campos intermediários.
 */
function parseEntrada(linhas) {
  const registros = []
  const ignorados  = []

  for (const linha of linhas) {
    const partes = linha.split('\t')
    if (partes.length < 3) continue

    const data = partes[0].trim()
    if (!RE_DATE.test(data)) continue

    // Encontra o valor BRL na linha
    const idxValor = partes.findIndex(p => RE_BRL.test(p.trim()))
    if (idxValor === -1) {
      ignorados.push(linha)
      continue
    }

    const valor = parseBRL(partes[idxValor])
    if (valor <= 0) { ignorados.push(linha); continue }

    // Campos antes do valor: Provedor, Categoria, Forma
    const campos = partes.slice(1, idxValor).map(p => p.trim())
    const provedor  = campos[0] || ''
    const categoria = campos[1] || ''
    const forma     = campos[2] || ''

    // Campos depois do valor: Referência, [status], Igreja
    const apos = partes.slice(idxValor + 1).map(p => p.trim())
    // O último campo costuma ser o nome da igreja, o penúltimo é referência
    // mas pode haver ícone/status entre eles — filtra campos vazios
    const aposValidos = apos.filter(a => a.length > 1 && !/^[✓✗▸▾▼▲•◦]$/.test(a))
    const referencia = aposValidos[0] || ''
    const igreja     = aposValidos[aposValidos.length - 1] || ''

    registros.push({ data, provedor, categoria, forma, valor, referencia, igreja })
  }

  return { registros, ignorados }
}

/**
 * Saída PDF — colunas esperadas:
 * Data de vencimento | Referência | Fornecedor | Categoria | Valor
 *
 * Estratégia: mesma — ancora em data, localiza valor BRL.
 */
function parseSaida(linhas) {
  const registros = []
  const ignorados  = []

  for (const linha of linhas) {
    const partes = linha.split('\t')
    if (partes.length < 3) continue

    const data = partes[0].trim()
    if (!RE_DATE.test(data)) continue

    const idxValor = partes.findIndex(p => RE_BRL.test(p.trim()))
    if (idxValor === -1) {
      ignorados.push(linha)
      continue
    }

    const valor = parseBRL(partes[idxValor])
    if (valor <= 0) { ignorados.push(linha); continue }

    const campos = partes.slice(1, idxValor).map(p => p.trim())
    const referencia  = campos[0] || ''
    const fornecedor  = campos[1] || ''
    const categoria   = campos.slice(2).join(' ') || ''

    registros.push({ data, referencia, fornecedor, categoria, valor })
  }

  return { registros, ignorados }
}

// ─── ROLLBACK ─────────────────────────────────────────────────────────────────

async function rollback() {
  console.log('\n🔄 ROLLBACK — desfazendo importação PDF\n')

  const { data: grupos } = await supabase.from('church_groups').select('id, name')
  const grupo = grupos[0]

  const { count: cLanc } = await supabase.from('fin_lancamentos')
    .select('id', { count: 'exact', head: true })
    .eq('origem', 'importado').eq('church_group_id', grupo.id)
  const { count: cForn } = await supabase.from('fin_fornecedores')
    .select('id', { count: 'exact', head: true })
    .eq('observacao', FORN_IMPORT_TAG).eq('church_group_id', grupo.id)

  console.log(`  Lançamentos importados: ${cLanc || 0}`)
  console.log(`  Fornecedores IMPORT_LEGACY: ${cForn || 0}`)

  if (!cLanc && !cForn) { console.log('\n  Nada a remover. ✅'); return }

  const { error: errL } = await supabase.from('fin_lancamentos')
    .delete().eq('origem', 'importado').eq('church_group_id', grupo.id)
  if (errL) throw new Error('Erro deletando lançamentos: ' + errL.message)
  console.log(`  ✅ ${cLanc} lançamentos removidos`)

  const { error: errF } = await supabase.from('fin_fornecedores')
    .delete().eq('observacao', FORN_IMPORT_TAG).eq('church_group_id', grupo.id)
  if (errF) throw new Error('Erro deletando fornecedores: ' + errF.message)
  console.log(`  ✅ ${cForn} fornecedores removidos`)

  console.log('\n✅ Rollback concluído.')
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  if (ROLLBACK) { await rollback(); return }

  // ── Valida arquivos ────────────────────────────────────────────────────────
  const faltando = [PDF_ENTRADA, PDF_SAIDA].filter(f => !existsSync(f))
  if (faltando.length > 0) {
    console.error('❌ Arquivos não encontrados:')
    faltando.forEach(f => console.error(`   ${f}`))
    console.error('\n   Coloque os PDFs na pasta imports/financeiro/ e tente novamente.')
    process.exit(1)
  }

  // ── Extrai texto dos PDFs ──────────────────────────────────────────────────
  console.log('\n📄 Extraindo texto dos PDFs...')
  const linhasEntrada = await extrairLinhas(PDF_ENTRADA)
  const linhasSaida   = await extrairLinhas(PDF_SAIDA)
  console.log(`  entrada 2026.pdf: ${linhasEntrada.length} linhas de texto`)
  console.log(`  saida 2026.pdf:   ${linhasSaida.length} linhas de texto`)

  // ── Modo inspeção ──────────────────────────────────────────────────────────
  if (INSPECT) {
    console.log('\n═══ ENTRADA (primeiras 60 linhas) ═══')
    linhasEntrada.slice(0, 60).forEach((l, i) => console.log(`  ${i + 1}: ${l}`))
    console.log('\n═══ SAÍDA (primeiras 40 linhas) ═══')
    linhasSaida.slice(0, 40).forEach((l, i) => console.log(`  ${i + 1}: ${l}`))
    return
  }

  // ── Parseia registros ──────────────────────────────────────────────────────
  console.log('\n⚙️  Parseando registros...')
  const { registros: receitasRaw, ignorados: ignE } = parseEntrada(linhasEntrada)
  const { registros: despesasRaw, ignorados: ignS }  = parseSaida(linhasSaida)
  console.log(`  Receitas parseadas: ${receitasRaw.length} (ignoradas: ${ignE.length})`)
  console.log(`  Despesas parseadas: ${despesasRaw.length} (ignoradas: ${ignS.length})`)

  if (receitasRaw.length === 0 && despesasRaw.length === 0) {
    console.error('\n❌ Nenhum registro encontrado. Use --inspect para ver o texto bruto do PDF.')
    process.exit(1)
  }

  // ── Carrega dados do banco ─────────────────────────────────────────────────
  console.log('\n🔍 Buscando dados do Supabase...')

  const { data: grupos } = await supabase.from('church_groups').select('id, name')
  const grupo = grupos[0]
  console.log(`  Grupo: ${grupo.name}`)

  const { data: igrejas } = await supabase.from('churches').select('id, name').eq('group_id', grupo.id)
  const mapaIgreja = {}
  igrejas.forEach(c => { mapaIgreja[norm(c.name)] = c.id })

  function resolveIgreja(nomeRaw) {
    const n = norm(nomeRaw)
    const destino = MAPA_IGREJA[n]
    if (destino && mapaIgreja[destino]) return mapaIgreja[destino]
    if (mapaIgreja[n]) return mapaIgreja[n]
    // Fallback: sede
    return mapaIgreja[norm('ADP Piracanjuba — Sede')] || Object.values(mapaIgreja)[0]
  }

  const { data: categoriasDB } = await supabase
    .from('fin_categorias').select('id, nome, tipo').eq('church_group_id', grupo.id)
  const mapaCat = { entrada: {}, saida: {} }
  categoriasDB.forEach(c => { mapaCat[c.tipo][norm(c.nome)] = c.id })
  console.log(`  Categorias existentes: ${categoriasDB.length}`)

  const { data: membros } = await supabase.from('members').select('id, name, apelido')
  const mapaMembro = {}
  membros.forEach(m => {
    if (m.name)   mapaMembro[norm(m.name)]   = m.id
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
  console.log(`  Master: ${masterUsers[0].email}`)

  // ── Verifica duplicatas ────────────────────────────────────────────────────
  const { count: jaImportados } = await supabase.from('fin_lancamentos')
    .select('id', { count: 'exact', head: true })
    .eq('origem', 'importado').eq('church_group_id', grupo.id)

  if (jaImportados > 0 && !FORCE && !DRY_RUN) {
    console.log(`\n⚠️  Já existem ${jaImportados} lançamentos com origem='importado'.`)
    console.log('   Use --rollback para desfazer ou --force para reimportar.')
    process.exit(0)
  }

  // ── Cria categorias faltantes ──────────────────────────────────────────────
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
    console.log('  ✅ Todas as categorias já existem')
  }

  // ── Cria fornecedores novos (despesas) ─────────────────────────────────────
  console.log('\n🏢 Verificando fornecedores...')
  const nomesForns = new Set(despesasRaw.map(r => r.fornecedor).filter(Boolean))
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
      console.log(`  ✅ ${criados.length} fornecedores criados`)
    } else {
      novosFornNomes.forEach(n => { mapaForn[norm(n)] = 'dry-run-id' })
    }
  } else {
    console.log('  ✅ Nenhum fornecedor novo')
  }

  // ── Monta lançamentos ──────────────────────────────────────────────────────
  console.log('\n⚙️  Montando lançamentos...')

  const lancamentos = []
  const nomesSemMatch = {}
  const catsSemMatch  = new Set()
  const igrejasSemMatch = new Set()

  // Entradas
  for (const r of receitasRaw) {
    const dataISO = parseDateBR(r.data)
    if (!dataISO) continue

    const nomeCanonico = MAPA_CAT_ENTRADA[norm(r.categoria)] || null
    const categoriaId  = nomeCanonico ? (mapaCat['entrada'][norm(nomeCanonico)] || null) : null
    if (r.categoria && !categoriaId) catsSemMatch.add(`entrada: ${r.categoria}`)

    const churchId = resolveIgreja(r.igreja)
    if (r.igreja && !mapaIgreja[norm(r.igreja)] && !MAPA_IGREJA[norm(r.igreja)]) {
      igrejasSemMatch.add(r.igreja)
    }

    let memberId         = null
    let memberNomeManual = null

    if (r.provedor) {
      memberId = mapaMembro[norm(r.provedor)] || null
      if (!memberId) {
        memberNomeManual = r.provedor
        nomesSemMatch[r.provedor] = (nomesSemMatch[r.provedor] || 0) + 1
      }
    }

    lancamentos.push({
      church_group_id:    grupo.id,
      church_id:          churchId,
      tipo:               'entrada',
      categoria_id:       categoriaId,
      fornecedor_id:      null,
      member_id:          memberId,
      member_nome_manual: memberNomeManual,
      valor:              r.valor,
      descricao:          r.categoria || null,
      referencia_culto:   null,
      data_lancamento:    dataISO,
      origem:             'importado',
      periodo_referencia: r.referencia || null,
      created_by:         masterId,
      observacao:         r.forma || null,
    })
  }

  // Despesas
  for (const r of despesasRaw) {
    const dataISO = parseDateBR(r.data)
    if (!dataISO) continue

    const nomeCanonico = MAPA_CAT_SAIDA[norm(r.categoria)] || null
    const categoriaId  = nomeCanonico ? (mapaCat['saida'][norm(nomeCanonico)] || null) : null
    if (r.categoria && !categoriaId) catsSemMatch.add(`saida: ${r.categoria}`)

    const fornecedorId = r.fornecedor ? (mapaForn[norm(r.fornecedor)] || null) : null

    lancamentos.push({
      church_group_id:    grupo.id,
      church_id:          resolveIgreja(''),
      tipo:               'saida',
      categoria_id:       categoriaId,
      fornecedor_id:      fornecedorId,
      member_id:          null,
      member_nome_manual: r.fornecedor && !fornecedorId ? r.fornecedor : null,
      valor:              r.valor,
      descricao:          r.categoria || null,
      referencia_culto:   null,
      data_lancamento:    dataISO,
      origem:             'importado',
      periodo_referencia: r.referencia || null,
      created_by:         masterId,
      observacao:         null,
    })
  }

  // ── Relatório ──────────────────────────────────────────────────────────────
  const entradas = lancamentos.filter(l => l.tipo === 'entrada')
  const saidas   = lancamentos.filter(l => l.tipo === 'saida')
  const totalE   = entradas.reduce((s, l) => s + l.valor, 0)
  const totalS   = saidas.reduce((s, l) => s + l.valor, 0)

  console.log(`\n📊 Resumo:`)
  console.log(`  Receitas: ${entradas.length} | R$ ${totalE.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
  console.log(`  Despesas: ${saidas.length} | R$ ${totalS.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
  console.log(`  Total:    ${lancamentos.length} lançamentos`)

  const matchados = entradas.filter(l => l.member_id).length
  const manual    = entradas.filter(l => !l.member_id && l.member_nome_manual).length
  const pctMatch  = entradas.length > 0 ? ((matchados / entradas.length) * 100).toFixed(1) : 0
  console.log(`  Entradas vinculadas a membros: ${matchados} (${pctMatch}%)`)
  console.log(`  Entradas com nome manual: ${manual}`)

  const semCat = lancamentos.filter(l => !l.categoria_id).length
  console.log(`  Lançamentos sem categoria: ${semCat}`)

  if (catsSemMatch.size > 0) {
    console.log(`\n⚠️  Categorias sem mapeamento (${catsSemMatch.size}):`)
    catsSemMatch.forEach(c => console.log(`    - ${c}`))
  }
  if (igrejasSemMatch.size > 0) {
    console.log(`\n⚠️  Igrejas sem match:`)
    igrejasSemMatch.forEach(i => console.log(`    - ${i}`))
  }
  if (Object.keys(nomesSemMatch).length > 0) {
    const top10 = Object.entries(nomesSemMatch).sort((a, b) => b[1] - a[1]).slice(0, 10)
    console.log(`\n⚠️  Provedores sem match (top 10):`)
    top10.forEach(([nome, qtd]) => console.log(`    - ${nome} (${qtd}x)`))
    const relatorio = {
      data_geracao: new Date().toISOString(),
      total_sem_match: Object.keys(nomesSemMatch).length,
      provedores: Object.entries(nomesSemMatch).sort((a, b) => b[1] - a[1]).map(([nome, ocorrencias]) => ({ nome, ocorrencias })),
    }
    writeFileSync('imports/financeiro/provedores-sem-match-pdf.json', JSON.stringify(relatorio, null, 2), 'utf8')
    console.log(`  Salvo em: imports/financeiro/provedores-sem-match-pdf.json`)
  }

  // ── Inserção ───────────────────────────────────────────────────────────────
  if (DRY_RUN) {
    console.log('\n✅ [DRY-RUN] Simulação concluída. Nada foi inserido.')
    console.log('   Execute sem --dry-run para importar de verdade.')
    return
  }

  console.log('\n💾 Inserindo lançamentos...')
  const total = await batchInsert('fin_lancamentos', lancamentos, 200)
  console.log(`\n✅ Importação concluída! ${total} lançamentos inseridos.`)
  console.log(`   Em caso de problema: node scripts/migration/import-fin-pdf-2026.mjs --rollback`)
}

main().catch(err => {
  console.error('\n❌ Erro fatal:', err.message)
  console.error(err.stack)
  process.exit(1)
})
