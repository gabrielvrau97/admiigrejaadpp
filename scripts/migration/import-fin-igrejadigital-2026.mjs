/**
 * Importação de lançamentos financeiros — Igreja Digital 2026 → Supabase
 *
 * Uso:
 *   node scripts/migration/import-fin-igrejadigital-2026.mjs --dry-run
 *   node scripts/migration/import-fin-igrejadigital-2026.mjs
 *   node scripts/migration/import-fin-igrejadigital-2026.mjs --force
 *   node scripts/migration/import-fin-igrejadigital-2026.mjs --rollback
 *
 * Arquivos esperados em imports/financeiro/:
 *   - "Financeiro_Receitas_*.xls"  → receitas confirmadas 2026
 *   - "Financeiro_Despesas_*.xls"  → despesas pagas 2026
 *
 * Formato:
 *   - HTML disfarçado de .xls, encoding latin1
 *   - Valores já em REAIS (ex: "160,00" = R$ 160,00)
 *   - Datas como DD/MM/YYYY
 *   - Rows de dados: <tr class="item">
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs'

config()

const DRY_RUN  = process.argv.includes('--dry-run')
const FORCE    = process.argv.includes('--force')
const ROLLBACK = process.argv.includes('--rollback')

const SUPABASE_URL          = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error('❌ Faltam variáveis: VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const FORN_IMPORT_TAG = 'IMPORT_LEGACY'
const PASTA = 'imports/financeiro'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const HTML_ENTITIES = {
  '&mdash;': '—', '&ndash;': '–', '&amp;': '&', '&nbsp;': ' ',
  '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>',
  '&aacute;': 'á', '&Aacute;': 'Á', '&agrave;': 'à', '&Agrave;': 'À',
  '&atilde;': 'ã', '&Atilde;': 'Ã', '&acirc;': 'â', '&Acirc;': 'Â',
  '&eacute;': 'é', '&Eacute;': 'É', '&egrave;': 'è',
  '&ecirc;': 'ê', '&Ecirc;': 'Ê',
  '&iacute;': 'í', '&Iacute;': 'Í',
  '&oacute;': 'ó', '&Oacute;': 'Ó',
  '&otilde;': 'õ', '&Otilde;': 'Õ', '&ocirc;': 'ô', '&Ocirc;': 'Ô',
  '&uacute;': 'ú', '&Uacute;': 'Ú',
  '&ccedil;': 'ç', '&Ccedil;': 'Ç',
}

function decodeHtml(s) {
  if (!s) return ''
  return String(s).replace(/&[a-zA-Z]+;/g, m => HTML_ENTITIES[m] ?? m).trim()
}

/** Normaliza para lookup: remove acentos, lowercase, colapsa espaços */
function norm(s) {
  if (!s) return ''
  return String(s)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim()
}

const MAPA_FORMA = {
  'dinheiro':          'dinheiro',
  'pix':               'pix',
  'cartao de debito':  'cartao_debito',
  'cartao de credito': 'cartao_credito',
}
function resolveForma(s) {
  if (!s) return null
  return MAPA_FORMA[norm(s)] ?? null
}

/** "1.234,56" → 1234.56 */
function parseBRL(s) {
  if (!s) return 0
  const v = parseFloat(String(s).replace(/\./g, '').replace(',', '.'))
  return isNaN(v) ? 0 : v
}

/** "05/01/2026" → "2026-01-05" */
function parseDateBR(s) {
  if (!s) return null
  const m = String(s).match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null
}

// ─── Parser HTML ───────────────────────────────────────────────────────────────

/** Extrai células <td> de uma linha <tr> */
function extractTds(trHtml) {
  const tds = []
  const re = /<td[^>]*>([\s\S]*?)<\/td>/gi
  let m
  while ((m = re.exec(trHtml)) !== null) {
    tds.push(decodeHtml(m[1].replace(/<[^>]+>/g, '').trim()))
  }
  return tds
}

/** Lê arquivo como latin1 e extrai todas as linhas <tr class="item"> */
function parseHtmlXls(caminho) {
  const html = readFileSync(caminho, 'latin1')
  const rows = []
  const re = /<tr[^>]*class="item"[^>]*>([\s\S]*?)<\/tr>/gi
  let m
  while ((m = re.exec(html)) !== null) {
    rows.push(extractTds(m[1]))
  }
  return rows
}

// ─── Encontra arquivos na pasta ────────────────────────────────────────────────

function encontrarArquivo(prefixo) {
  const files = readdirSync(PASTA).filter(f =>
    f.toLowerCase().startsWith(prefixo.toLowerCase()) && f.endsWith('.xls')
  )
  if (files.length === 0) return null
  return `${PASTA}/${files[0]}`
}

// ─── Mapeamento de categorias ─────────────────────────────────────────────────
// Chave: norm() do nome no arquivo | Valor: nome canônico no banco

const MAPA_CAT_ENTRADA = {
  'dizimo':                'Dízimo',
  'oferta':                'Oferta Geral',
  'oferta geral':          'Oferta Geral',
  'oferta ebd':            'Oferta EBD',
  'parceiro fiel':         'Parceiro Fiel',
  'renda':                 'Renda',
  'anuidade ministros':    'Anuidade Ministros',
  'revistas da ebd':       'Revistas da EBD',
  'repasse congregacoes':  'Repasse Congregações',
  'repasse departamentos': 'Repasse Departamentos',
  'campanha':              'Campanha',
  'outros':                'Outros',
}

const MAPA_CAT_SAIDA = {
  'agua/luz/telefone':              'Conta Fixa',
  'conta fixa':                     'Conta Fixa',
  'consumo/alimentacao':            'Consumo/Alimentação',
  'consumo':                        'Consumo/Alimentação',
  'alimentacao':                    'Alimentação',
  'combustivel':                    'Combustível',
  'materiais':                      'Material',
  'material':                       'Material',
  'servico':                        'Serviços',
  'servicos':                       'Serviços',
  'internet':                       'Internet',
  'prebenda':                       'Prebenda',
  'ajuda a congregacoes':           'Ajuda a Congregações',
  'ajuda departamento':             'Ajuda Departamento',
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
  'construcao':                     'Construção',
  'impostos':                       'Impostos',
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

// Mapeamento de igrejas (nome do arquivo → nome normalizado do banco)
const MAPA_IGREJA = {
  'adp sede (sede)':             'adp piracanjuba — sede',
  'sede':                        'adp piracanjuba — sede',
  'adp piracanjuba':             'adp piracanjuba — sede',
  'adp bela vista (filial)':     'adp bela vista',
  'adp bela vista':              'adp bela vista',
  'adp areia (filial)':          'adp areia',
  'adp areia':                   'adp areia',
  'adp trevo floresta (filial)': 'adp trevo floresta',
  'adp trevo floresta':          'adp trevo floresta',
}

// ─── Batch insert ──────────────────────────────────────────────────────────────

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

// ─── ROLLBACK ─────────────────────────────────────────────────────────────────

async function rollback() {
  console.log('\n🔄 ROLLBACK\n')
  const { data: grupos } = await supabase.from('church_groups').select('id, name')
  const grupo = grupos[0]

  const { count: cL } = await supabase.from('fin_lancamentos')
    .select('id', { count: 'exact', head: true })
    .eq('origem', 'importado').eq('church_group_id', grupo.id)
  const { count: cF } = await supabase.from('fin_fornecedores')
    .select('id', { count: 'exact', head: true })
    .eq('observacao', FORN_IMPORT_TAG).eq('church_group_id', grupo.id)

  console.log(`  Lançamentos importados: ${cL || 0}`)
  console.log(`  Fornecedores IMPORT_LEGACY: ${cF || 0}`)
  if (!cL && !cF) { console.log('\n  Nada a remover. ✅'); return }

  const { error: eL } = await supabase.from('fin_lancamentos')
    .delete().eq('origem', 'importado').eq('church_group_id', grupo.id)
  if (eL) throw new Error('Erro deletando lançamentos: ' + eL.message)
  console.log(`  ✅ ${cL} lançamentos removidos`)

  const { error: eF } = await supabase.from('fin_fornecedores')
    .delete().eq('observacao', FORN_IMPORT_TAG).eq('church_group_id', grupo.id)
  if (eF) throw new Error('Erro deletando fornecedores: ' + eF.message)
  console.log(`  ✅ ${cF} fornecedores removidos`)
  console.log('\n✅ Rollback concluído.')
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  if (ROLLBACK) { await rollback(); return }

  // ── Localiza arquivos ──────────────────────────────────────────────────────
  const arqReceitas = encontrarArquivo('Financeiro_Receitas_')
  const arqDespesas = encontrarArquivo('Financeiro_Despesas_')

  if (!arqReceitas || !arqDespesas) {
    console.error('❌ Arquivos não encontrados em', PASTA)
    if (!arqReceitas) console.error('   Faltando: Financeiro_Receitas_*.xls')
    if (!arqDespesas) console.error('   Faltando: Financeiro_Despesas_*.xls')
    process.exit(1)
  }

  console.log(`\n🚀 Importação ${DRY_RUN ? '[DRY-RUN]' : FORCE ? '[FORCE]' : '[REAL]'}\n`)
  console.log('📂 Arquivos:')
  console.log('  ' + arqReceitas.split('/').pop())
  console.log('  ' + arqDespesas.split('/').pop())

  // ── Parse HTML ─────────────────────────────────────────────────────────────
  console.log('\n📄 Parseando HTML...')
  const rowsReceitas = parseHtmlXls(arqReceitas)
  const rowsDespesas = parseHtmlXls(arqDespesas)
  console.log(`  Receitas brutas: ${rowsReceitas.length}`)
  console.log(`  Despesas brutas: ${rowsDespesas.length}`)

  // Receitas: filtrar só "Confirmado" (col[6])
  const receitasValidas = rowsReceitas.filter(r => r[6] === 'Confirmado')
  console.log(`  Receitas confirmadas: ${receitasValidas.length} (${rowsReceitas.length - receitasValidas.length} em aberto ignorados)`)

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
    if (m.name)    mapaMembro[norm(m.name)]    = m.id
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
      const { data: criadas, error } = await supabase
        .from('fin_categorias').insert(novasCats).select('id, nome, tipo')
      if (error) throw new Error('Erro criar categorias: ' + error.message)
      criadas.forEach(c => { mapaCat[c.tipo][norm(c.nome)] = c.id })
      console.log(`  ✅ ${criadas.length} categorias criadas`)
    } else {
      novasCats.forEach(c => { mapaCat[c.tipo][norm(c.nome)] = 'dry-run-id' })
    }
  } else {
    console.log('  ✅ Todas as categorias já existem')
  }

  // ── Cria fornecedores novos ────────────────────────────────────────────────
  console.log('\n🏢 Verificando fornecedores...')
  const nomesForns = new Set(rowsDespesas.map(r => r[2]).filter(Boolean))
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
  let semData = 0

  // Receitas: [0]=Data [1]=Provedor [2]=Categoria [3]=Forma [4]=Valor [5]=Referência [6]=Status [7]=Histórico
  for (const r of receitasValidas) {
    const dataISO = parseDateBR(r[0])
    if (!dataISO) { semData++; continue }

    const valor = parseBRL(r[4])
    if (valor <= 0) continue

    const nomeOrigCat  = r[2] || ''
    const nomeCanonico = MAPA_CAT_ENTRADA[norm(nomeOrigCat)] || null
    const categoriaId  = nomeCanonico ? (mapaCat['entrada'][norm(nomeCanonico)] || null) : null
    if (nomeOrigCat && !categoriaId) catsSemMatch.add(`entrada: ${nomeOrigCat}`)

    const nomeProvedor = r[1] || ''
    let memberId         = null
    let memberNomeManual = null

    if (nomeProvedor) {
      memberId = mapaMembro[norm(nomeProvedor)] || null
      if (!memberId) {
        memberNomeManual = nomeProvedor
        nomesSemMatch[nomeProvedor] = (nomesSemMatch[nomeProvedor] || 0) + 1
      }
    }

    lancamentos.push({
      church_group_id:    grupo.id,
      church_id:          resolveIgreja(r[7] || ''),
      tipo:               'entrada',
      categoria_id:       categoriaId,
      fornecedor_id:      null,
      member_id:          memberId,
      member_nome_manual: memberNomeManual,
      valor,
      descricao:          nomeOrigCat || null,
      referencia_culto:   null,
      data_lancamento:    dataISO,
      origem:             'importado',
      periodo_referencia: r[5] || null,
      created_by:         masterId,
      forma_pagamento:    resolveForma(r[3]),
      observacao:         null,
    })
  }

  // Despesas: [0]=Data de vencimento [1]=Referência [2]=Fornecedor [3]=Categoria [4]=Valor
  for (const r of rowsDespesas) {
    const dataISO = parseDateBR(r[0])
    if (!dataISO) { semData++; continue }

    const valor = parseBRL(r[4])
    if (valor <= 0) continue

    const nomeOrigCat  = r[3] || ''
    const nomeCanonico = MAPA_CAT_SAIDA[norm(nomeOrigCat)] || null
    const categoriaId  = nomeCanonico ? (mapaCat['saida'][norm(nomeCanonico)] || null) : null
    if (nomeOrigCat && !categoriaId) catsSemMatch.add(`saida: ${nomeOrigCat}`)

    const nomeForn     = r[2] || ''
    const fornecedorId = nomeForn ? (mapaForn[norm(nomeForn)] || null) : null

    lancamentos.push({
      church_group_id:    grupo.id,
      church_id:          resolveIgreja(''),   // despesas não têm coluna de igreja
      tipo:               'saida',
      categoria_id:       categoriaId,
      fornecedor_id:      fornecedorId,
      member_id:          null,
      member_nome_manual: null,
      valor,
      descricao:          nomeOrigCat || null,
      referencia_culto:   null,
      data_lancamento:    dataISO,
      origem:             'importado',
      periodo_referencia: r[1] || null,
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
  console.log(`  Lançamentos sem categoria: ${lancamentos.filter(l => !l.categoria_id).length}`)
  if (semData > 0) console.log(`  Linhas sem data válida ignoradas: ${semData}`)

  if (catsSemMatch.size > 0) {
    console.log(`\n⚠️  Categorias sem mapeamento (${catsSemMatch.size}):`)
    catsSemMatch.forEach(c => console.log(`    - ${c}`))
  }

  if (Object.keys(nomesSemMatch).length > 0) {
    const top10 = Object.entries(nomesSemMatch).sort((a, b) => b[1] - a[1]).slice(0, 10)
    console.log(`\n⚠️  Provedores sem match no cadastro (top 10):`)
    top10.forEach(([nome, qtd]) => console.log(`    - ${nome} (${qtd}x)`))
    const relatorio = {
      data_geracao: new Date().toISOString(),
      total_sem_match: Object.keys(nomesSemMatch).length,
      provedores: Object.entries(nomesSemMatch)
        .sort((a, b) => b[1] - a[1])
        .map(([nome, ocorrencias]) => ({ nome, ocorrencias })),
    }
    writeFileSync(
      'imports/financeiro/provedores-sem-match-2026.json',
      JSON.stringify(relatorio, null, 2), 'utf8'
    )
    console.log(`  Salvo em: imports/financeiro/provedores-sem-match-2026.json`)
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
  console.log(`   Em caso de problema: node scripts/migration/import-fin-igrejadigital-2026.mjs --rollback`)
}

main().catch(err => {
  console.error('\n❌ Erro fatal:', err.message)
  console.error(err.stack)
  process.exit(1)
})
