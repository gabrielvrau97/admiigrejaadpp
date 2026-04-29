/**
 * Rollback de uma migração.
 * Apaga members e members_legacy_raw que vieram de uma source específica.
 *
 * Uso:
 *   node scripts/migration/rollback.mjs --source=sistema_antigo_membros_2026_04
 *   node scripts/migration/rollback.mjs --all  (apaga todas as importações legacy)
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const args = process.argv.slice(2)
const sourceArg = args.find(a => a.startsWith('--source='))
const all = args.includes('--all')

if (!sourceArg && !all) {
  console.error('Uso: --source=NOME ou --all')
  process.exit(1)
}

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

async function main() {
  let sources = []
  if (all) {
    const { data } = await supabase
      .from('members_legacy_raw')
      .select('source')
    sources = [...new Set((data ?? []).map(r => r.source))]
  } else {
    sources = [sourceArg.split('=')[1]]
  }

  console.log('Sources a limpar:', sources)
  for (const source of sources) {
    // pega member_ids vinculados
    const { data: legacyRows } = await supabase
      .from('members_legacy_raw')
      .select('member_id')
      .eq('source', source)
      .not('member_id', 'is', null)

    const memberIds = [...new Set((legacyRows ?? []).map(r => r.member_id))]
    console.log(`  ${source}: ${memberIds.length} membros + ${legacyRows?.length ?? 0} linhas legacy`)

    // Apaga members em batches (cascade vai limpar contacts/family/ministry)
    if (memberIds.length > 0) {
      const BATCH = 100
      for (let i = 0; i < memberIds.length; i += BATCH) {
        const batch = memberIds.slice(i, i + BATCH)
        const { error } = await supabase.from('members').delete().in('id', batch)
        if (error) console.warn('  erro members:', error.message)
        process.stdout.write(`\r    apagando members: ${Math.min(i + BATCH, memberIds.length)}/${memberIds.length}`)
      }
      console.log('')
    }

    // Apaga linhas do legacy_raw (já não tem FK pq members foi cascade)
    const { error: e2 } = await supabase
      .from('members_legacy_raw')
      .delete()
      .eq('source', source)
    if (e2) console.warn('  erro legacy_raw:', e2.message)

    console.log(`  ✅ ${source} limpo`)
  }

  console.log('\n✅ Rollback concluído.')
}

main().catch(e => {
  console.error('💥', e.message)
  process.exit(1)
})
