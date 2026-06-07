/**
 * Validação dos totais financeiros 2026 direto no banco.
 * Pagina sem cair no limite default de 1.000 do PostgREST.
 *
 *   node scripts/migration/validate-fin-2026.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const SUPABASE_URL          = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error('❌ Faltam VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const brl = n => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

async function main() {
  // grupo
  const { data: grupo } = await supabase
    .from('church_groups').select('id, name').limit(1).single()
  console.log(`Grupo: ${grupo.name} (${grupo.id})\n`)

  const INICIO = '2026-01-01'
  const FIM    = '2026-12-31'

  // paginação completa
  let all = []
  let from = 0
  const PAGE = 1000
  for (;;) {
    const { data, error } = await supabase
      .from('fin_lancamentos')
      .select('tipo, valor, origem, data_lancamento')
      .eq('church_group_id', grupo.id)
      .gte('data_lancamento', INICIO)
      .lte('data_lancamento', FIM)
      .range(from, from + PAGE - 1)
    if (error) throw error
    all = all.concat(data)
    if (data.length < PAGE) break
    from += PAGE
  }

  const entradas = all.filter(r => r.tipo === 'entrada')
  const saidas   = all.filter(r => r.tipo === 'saida')
  const totE = entradas.reduce((s, r) => s + Number(r.valor), 0)
  const totS = saidas.reduce((s, r) => s + Number(r.valor), 0)

  console.log('═══ TOTAIS REAIS NO BANCO (período 2026) ═══')
  console.log(`Lançamentos totais : ${all.length}`)
  console.log(`  entradas         : ${entradas.length}  ->  ${brl(totE)}`)
  console.log(`  saídas           : ${saidas.length}  ->  ${brl(totS)}`)
  console.log(`  SALDO            : ${brl(totE - totS)}`)

  // quebra por origem
  const importadas = all.filter(r => r.origem === 'importado')
  const manuais    = all.filter(r => r.origem !== 'importado')
  console.log(`\nPor origem:`)
  console.log(`  importado : ${importadas.length}`)
  console.log(`  outras    : ${manuais.length}`)

  // datas extremas
  const datas = all.map(r => r.data_lancamento).sort()
  console.log(`\nIntervalo de datas: ${datas[0]} .. ${datas[datas.length - 1]}`)
}

main().catch(e => { console.error(e); process.exit(1) })
