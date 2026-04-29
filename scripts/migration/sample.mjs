// Mostra 2 linhas completas do arquivo principal pra entender formato de cada campo
import * as XLSX from 'xlsx'
import { readFileSync } from 'fs'

const buf = readFileSync('imports/BACKUP_Secretaria_Membros_Todos.xls')
const wb = XLSX.read(buf, { cellDates: true, type: 'buffer' })
const sheet = wb.Sheets['Sheet1']

// Como a 1ª e 2ª linhas são header artificial, pulo elas
const rows = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: false, header: 1 })

// Header está em rows[1]
const header = rows[1]
console.log('HEADERS:')
header.forEach((h, i) => console.log(`  [${i}] ${h}`))

console.log('\nLINHA 2 (primeiro membro real):')
const linha = rows[2]
linha.forEach((v, i) => {
  if (v !== null && v !== undefined && v !== '') {
    console.log(`  ${header[i]}: ${JSON.stringify(v)}`)
  }
})

console.log('\nLINHA 50 (amostra aleatória):')
const linha2 = rows[50]
linha2.forEach((v, i) => {
  if (v !== null && v !== undefined && v !== '') {
    console.log(`  ${header[i]}: ${JSON.stringify(v)}`)
  }
})
