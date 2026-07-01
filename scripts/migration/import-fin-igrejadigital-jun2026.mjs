/**
 * Importação de lançamentos financeiros — Igreja Digital jun/2026 → Supabase
 *
 * Importa somente os dados NOVOS de junho/2026 que ainda não estavam no banco.
 * Os dados de 02–05/06/2026 já foram importados pelo script anterior.
 * Este script importa: 07/06/2026 (receitas + despesas) e 08/06/2026.
 *
 * Uso:
 *   node scripts/migration/import-fin-igrejadigital-jun2026.mjs --dry-run
 *   node scripts/migration/import-fin-igrejadigital-jun2026.mjs
 *   node scripts/migration/import-fin-igrejadigital-jun2026.mjs --rollback
 *
 * Rollback remove somente origem='importado_jun2026' — não afeta importações anteriores.
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { readFileSync, readdirSync } from 'fs'

config()

const DRY_RUN  = process.argv.includes('--dry-run')
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

const ORIGEM_TAG = 'importado'
const FORN_IMPORT_TAG = 'IMPORT_LEGACY_JUN2026'
const PASTA = 'imports/financeiro'

// Importa somente dados a partir desta data (inclusive) que não estavam no banco
const DATA_CORTE = '2026-06-07'

// Tag na observacao para identificar este lote (permite rollback seletivo)
const OBSERVACAO_TAG = 'IMPORT_JUN2026'

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

function extractTds(trHtml) {
  const tds = []
  const re = /<td[^>]*>([\s\S]*?)<\/td>/gi
  let m
  while ((m = re.exec(trHtml)) !== null) {
    tds.push(decodeHtml(m[1].replace(/<[^>]+>/g, '').trim()))
  }
  return tds
}

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

// ─── Mapeamento de categorias ─────────────────────────────────────────────────

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
  console.log('\n🔄 ROLLBACK (observacao=IMPORT_JUN2026 + data >= 2026-06-07)\n')
  const { data: grupos } = await supabase.from('church_groups').select('id, name')
  const grupo = grupos[0]

  const { count: cL } = await supabase.from('fin_lancamentos')
    .select('id', { count: 'exact', head: true })
    .eq('origem', ORIGEM_TAG)
    .eq('church_group_id', grupo.id)
    .gte('data_lancamento', DATA_CORTE)
  const { count: cF } = await supabase.from('fin_fornecedores')
    .select('id', { count: 'exact', head: true })
    .eq('observacao', FORN_IMPORT_TAG).eq('church_group_id', grupo.id)

  console.log(`  Lançamentos deste lote (>= ${DATA_CORTE}): ${cL || 0}`)
  console.log(`  Fornecedores ${FORN_IMPORT_TAG}: ${cF || 0}`)
  if (!cL && !cF) { console.log('\n  Nada a remover. ✅'); return }

  const { error: eL } = await supabase.from('fin_lancamentos')
    .delete()
    .eq('origem', ORIGEM_TAG)
    .eq('church_group_id', grupo.id)
    .gte('data_lancamento', DATA_CORTE)
  if (eL) throw new Error('Erro deletando lançamentos: ' + eL.message)
  console.log(`  ✅ ${cL} lançamentos removidos`)

  if (cF > 0) {
    const { error: eF } = await supabase.from('fin_fornecedores')
      .delete().eq('observacao', FORN_IMPORT_TAG).eq('church_group_id', grupo.id)
    if (eF) throw new Error('Erro deletando fornecedores: ' + eF.message)
    console.log(`  ✅ ${cF} fornecedores removidos`)
  }

  console.log('\n✅ Rollback concluído.')
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  if (ROLLBACK) { await rollback(); return }

  // ── Localiza arquivos ──────────────────────────────────────────────────────
  const arquivos = readdirSync(PASTA).filter(f => f.endsWith('.xls'))
  const arqsReceitas = arquivos.filter(f => f.includes('Receitas'))
  const arqsDespesas = arquivos.filter(f => f.includes('Despesas'))

  if (arqsReceitas.length === 0 || arqsDespesas.length === 0) {
    console.error('❌ Arquivos não encontrados em', PASTA)
    process.exit(1)
  }

  console.log(`\n🚀 Importação Jun/2026 ${DRY_RUN ? '[DRY-RUN]' : '[REAL]'}\n`)
  console.log('📂 Arquivos de receitas:')
  arqsReceitas.forEach(f => console.log('  ' + f))
  console.log('📂 Arquivos de despesas:')
  arqsDespesas.forEach(f => console.log('  ' + f))
  console.log(`\n📅 Filtrando dados a partir de ${DATA_CORTE} (inclusive)\n`)

  // ── Parse e filtra por DATA_CORTE ──────────────────────────────────────────
  console.log('📄 Parseando HTML...')
  let rowsReceitas = []
  let rowsDespesas = []

  for (const f of arqsReceitas) {
    const rows = parseHtmlXls(`${PASTA}/${f}`)
    const novas = rows.filter(r => {
      const d = parseDateBR(r[0])
      return d && d >= DATA_CORTE && r[6] === 'Confirmado'
    })
    console.log(`  ${f.substring(0, 50)}: ${novas.length} receitas novas (de ${rows.length})`)
    rowsReceitas = rowsReceitas.concat(novas)
  }

  for (const f of arqsDespesas) {
    const rows = parseHtmlXls(`${PASTA}/${f}`)
    const novas = rows.filter(r => {
      const d = parseDateBR(r[0])
      return d && d >= DATA_CORTE
    })
    console.log(`  ${f.substring(0, 50)}: ${novas.length} despesas novas (de ${rows.length})`)
    rowsDespesas = rowsDespesas.concat(novas)
  }

  console.log(`\n  Total receitas: ${rowsReceitas.length}`)
  console.log(`  Total despesas: ${rowsDespesas.length}`)

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

  // ── Verifica duplicatas deste lote (somente >= DATA_CORTE) ────────────────
  const { count: jaImportados } = await supabase.from('fin_lancamentos')
    .select('id', { count: 'exact', head: true })
    .eq('origem', ORIGEM_TAG)
    .eq('church_group_id', grupo.id)
    .gte('data_lancamento', DATA_CORTE)

  if (jaImportados > 0 && !DRY_RUN) {
    console.log(`\n⚠️  Já existem ${jaImportados} lançamentos de ${DATA_CORTE}+ com origem='${ORIGEM_TAG}'.`)
    console.log('   Use --rollback para remover este lote e reimportar.')
    process.exit(0)
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
  const catsSemMatch  = new Set()
  let semData = 0

  // Receitas: [0]=Data [1]=Provedor [2]=Categoria [3]=Forma [4]=Valor [5]=Referência [6]=Status [7]=Histórico
  for (const r of rowsReceitas) {
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
      if (!memberId) memberNomeManual = nomeProvedor
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
      origem:             ORIGEM_TAG,
      periodo_referencia: r[5] || null,
      created_by:         masterId,
      forma_pagamento:    resolveForma(r[3]),
      observacao:         OBSERVACAO_TAG,
    })
  }

  // Despesas: [0]=Data [1]=Referência [2]=Fornecedor [3]=Categoria [4]=Valor
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
      church_id:          resolveIgreja(''),
      tipo:               'saida',
      categoria_id:       categoriaId,
      fornecedor_id:      fornecedorId,
      member_id:          null,
      member_nome_manual: null,
      valor,
      descricao:          nomeOrigCat || null,
      referencia_culto:   null,
      data_lancamento:    dataISO,
      origem:             ORIGEM_TAG,
      periodo_referencia: r[1] || null,
      created_by:         masterId,
      observacao:         OBSERVACAO_TAG,
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
  console.log(`  Sem categoria: ${lancamentos.filter(l => !l.categoria_id).length}`)
  if (semData > 0) console.log(`  Linhas sem data válida ignoradas: ${semData}`)

  if (catsSemMatch.size > 0) {
    console.log(`\n⚠️  Categorias sem mapeamento (${catsSemMatch.size}):`)
    catsSemMatch.forEach(c => console.log(`    - ${c}`))
  }

  // ── Inserção ───────────────────────────────────────────────────────────────
  if (DRY_RUN) {
    console.log('\n✅ [DRY-RUN] Simulação concluída. Nada foi inserido.')
    console.log('   Execute sem --dry-run para importar de verdade.')
    return
  }

  if (lancamentos.length === 0) {
    console.log('\n⚠️  Nenhum lançamento novo para importar.')
    return
  }

  console.log('\n💾 Inserindo lançamentos...')
  const total = await batchInsert('fin_lancamentos', lancamentos, 200)
  console.log(`\n✅ Importação concluída! ${total} lançamentos inseridos.`)
  console.log(`   Rollback: node scripts/migration/import-fin-igrejadigital-jun2026.mjs --rollback`)
}

main().catch(err => {
  console.error('\n❌ Erro fatal:', err.message)
  console.error(err.stack)
  process.exit(1)
})
