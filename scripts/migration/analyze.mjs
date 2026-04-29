// Lê os arquivos em imports/ e gera um relatório da estrutura.
// Uso: node scripts/migration/analyze.mjs

import * as XLSX from 'xlsx'
import { readdirSync, statSync, readFileSync } from 'fs'
import { join } from 'path'

const IMPORTS_DIR = 'imports'

function readFile(filename) {
  const path = join(IMPORTS_DIR, filename)
  const buffer = readFileSync(path)
  const wb = XLSX.read(buffer, { cellDates: true, type: 'buffer' })
  return wb
}

function analyzeSheet(filename, sheetName, sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: false })
  if (rows.length === 0) {
    return { filename, sheetName, totalRows: 0, columns: [], samples: [], issues: ['Aba vazia'] }
  }

  // Colunas presentes na primeira linha
  const allKeys = new Set()
  rows.forEach(r => Object.keys(r).forEach(k => allKeys.add(k)))
  const columns = [...allKeys]

  // Estatísticas por coluna
  const colStats = {}
  for (const col of columns) {
    let filled = 0
    let empty = 0
    let exemplos = new Set()
    let types = new Set()
    for (const row of rows) {
      const v = row[col]
      if (v === null || v === undefined || v === '') {
        empty++
      } else {
        filled++
        types.add(typeof v)
        if (exemplos.size < 3) exemplos.add(String(v).slice(0, 80))
      }
    }
    colStats[col] = {
      filled,
      empty,
      pctFilled: Math.round((filled / rows.length) * 100),
      types: [...types],
      samples: [...exemplos],
    }
  }

  // Detecção de problemas potenciais
  const issues = []

  // CPF
  const cpfCol = columns.find(c => /cpf/i.test(c))
  if (cpfCol) {
    const cpfs = rows.map(r => String(r[cpfCol] ?? '').replace(/\D/g, '')).filter(c => c)
    const dupCpfs = cpfs.filter((c, i) => c.length === 11 && cpfs.indexOf(c) !== i)
    const invalidLen = cpfs.filter(c => c.length > 0 && c.length !== 11).length
    if (dupCpfs.length) issues.push(`CPF duplicado dentro do mesmo arquivo: ${dupCpfs.length}`)
    if (invalidLen) issues.push(`CPFs com tamanho inválido (não 11 dígitos): ${invalidLen}`)
  }

  // Nomes
  const nameCol = columns.find(c => /^nome/i.test(c) || c.toLowerCase() === 'nome')
  if (nameCol) {
    const semNome = rows.filter(r => !r[nameCol] || String(r[nameCol]).trim() === '').length
    if (semNome) issues.push(`Linhas sem nome: ${semNome}`)
  }

  // Datas suspeitas
  const dateColumns = columns.filter(c => /data|nasc|batismo|conver|saida|entrada|admiss/i.test(c))

  return {
    filename,
    sheetName,
    totalRows: rows.length,
    columns: columns.length,
    columnList: columns,
    colStats,
    nameCol,
    cpfCol,
    dateColumns,
    issues,
    firstRow: rows[0],
    lastRow: rows[rows.length - 1],
  }
}

function main() {
  const files = readdirSync(IMPORTS_DIR)
    .filter(f => /\.(xlsx?|csv)$/i.test(f) && !f.startsWith('~'))
    .filter(f => {
      const stat = statSync(join(IMPORTS_DIR, f))
      return stat.isFile() && stat.size > 0
    })

  console.log(`\n📊 Analisando ${files.length} arquivo(s) em ${IMPORTS_DIR}/\n`)
  console.log('='.repeat(70))

  for (const file of files) {
    console.log(`\n📁 ${file}`)
    let wb
    try {
      wb = readFile(file)
    } catch (e) {
      console.log(`  ❌ Erro ao abrir: ${e.message}`)
      continue
    }

    for (const sheetName of wb.SheetNames) {
      const sheet = wb.Sheets[sheetName]
      const analysis = analyzeSheet(file, sheetName, sheet)
      console.log(`\n  📋 Aba: "${sheetName}"`)
      console.log(`     Total de linhas: ${analysis.totalRows}`)
      console.log(`     Total de colunas: ${analysis.columns}`)
      if (analysis.nameCol) console.log(`     Coluna de nome detectada: "${analysis.nameCol}"`)
      if (analysis.cpfCol) console.log(`     Coluna de CPF detectada: "${analysis.cpfCol}"`)
      if (analysis.dateColumns?.length) {
        console.log(`     Colunas com datas: ${analysis.dateColumns.join(', ')}`)
      }

      if (analysis.issues.length) {
        console.log(`\n     ⚠️  Problemas detectados:`)
        analysis.issues.forEach(i => console.log(`        - ${i}`))
      }

      console.log(`\n     📑 Colunas (${analysis.columns}):`)
      for (const col of analysis.columnList) {
        const stats = analysis.colStats[col]
        const fillBar = `${stats.pctFilled}%`.padStart(4)
        const samples = stats.samples.length > 0
          ? `[${stats.samples.map(s => `"${s}"`).join(', ')}]`
          : '(vazio)'
        console.log(`        ${fillBar} ${col.padEnd(35)} ${samples}`)
      }
    }
  }

  console.log('\n' + '='.repeat(70))
  console.log('\n✅ Análise concluída.\n')
}

main()
