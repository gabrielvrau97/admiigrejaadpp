/**
 * Passada 2 da migração: resolve códigos legacy (453693#NOME) em UUIDs reais.
 *
 * Uso:
 *   node scripts/migration/resolve-family-links.mjs --dry-run
 *   node scripts/migration/resolve-family-links.mjs
 *
 * Lê members_legacy_raw, pega os _legacy_codes guardados em raw_data, e:
 *   - se spouse_legacy_code existe, busca quem tem self_legacy_code igual e
 *     atualiza member_family.spouse_id
 *   - mesmo pra father_legacy_code e mother_legacy_code
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const DRY_RUN = process.argv.includes('--dry-run')

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

function normalizeName(s) {
  if (!s) return ''
  return String(s)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')  // remove acentos
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

async function main() {
  console.log('='.repeat(70))
  console.log(`  RESOLUÇÃO DE VÍNCULOS FAMILIARES ${DRY_RUN ? '(DRY-RUN)' : ''}`)
  console.log('='.repeat(70))

  // 1. Carrega todos os legacy_raw com member_id (já migrados)
  console.log('\n📖 Carregando registros legacy migrados...')
  const { data: legacy, error } = await supabase
    .from('members_legacy_raw')
    .select('id, member_id, raw_data')
    .not('member_id', 'is', null)
    .like('source', 'sistema_antigo_membros%')

  if (error) throw error
  console.log(`  ${legacy.length} registros para processar`)

  // 2. Carrega todos os members ativos pra mapear nome → id
  console.log('\n🗺️  Carregando todos os membros do banco...')
  const { data: allMembers, error: e2 } = await supabase
    .from('members')
    .select('id, name')
    .neq('status', 'deleted')
  if (e2) throw e2

  const nameToMemberId = new Map()
  const ambiguousNames = new Set()  // nomes que aparecem 2x ou mais
  for (const m of allMembers) {
    const norm = normalizeName(m.name)
    if (nameToMemberId.has(norm)) {
      ambiguousNames.add(norm)
    } else {
      nameToMemberId.set(norm, m.id)
    }
  }
  console.log(`  ${nameToMemberId.size} nomes únicos · ${ambiguousNames.size} ambíguos (mesmo nome 2x+)`)

  // 3. Pra cada legacy, tenta resolver os vínculos via nome
  let resolvedSpouse = 0
  let resolvedFather = 0
  let resolvedMother = 0
  let ambiguous = []  // nome bate em 2+ pessoas
  let unresolved = []  // nome não bate em ninguém

  function resolveByName(name) {
    if (!name) return null
    const norm = normalizeName(name)
    if (ambiguousNames.has(norm)) return { ambiguous: true }
    return nameToMemberId.get(norm) ?? null
  }

  for (const l of legacy) {
    const codes = l.raw_data?._legacy_codes ?? {}
    const updates = {}

    // Cônjuge: codes.spouse_legacy_code só me dá o ID antigo;
    // pra resolver, uso a coluna "Nome do cônjuge" do raw_data, removendo o "ID#"
    const spouseRaw = l.raw_data?.['Nome do cônjuge']
    if (spouseRaw) {
      const spouseName = String(spouseRaw).replace(/^\d+#/, '').trim()
      const r = resolveByName(spouseName)
      if (r && typeof r === 'string') { updates.spouse_id = r; resolvedSpouse++ }
      else if (r?.ambiguous) ambiguous.push({ memberId: l.member_id, type: 'cônjuge', name: spouseName })
      else if (codes.spouse_legacy_code) unresolved.push({ memberId: l.member_id, type: 'cônjuge', name: spouseName })
    }

    const fatherRaw = l.raw_data?.['Nome do pai']
    if (fatherRaw) {
      const fatherName = String(fatherRaw).replace(/^\d+#/, '').trim()
      const r = resolveByName(fatherName)
      if (r && typeof r === 'string') { updates.father_id = r; resolvedFather++ }
      else if (r?.ambiguous) ambiguous.push({ memberId: l.member_id, type: 'pai', name: fatherName })
      else if (codes.father_legacy_code) unresolved.push({ memberId: l.member_id, type: 'pai', name: fatherName })
    }

    const motherRaw = l.raw_data?.['Nome da mãe']
    if (motherRaw) {
      const motherName = String(motherRaw).replace(/^\d+#/, '').trim()
      const r = resolveByName(motherName)
      if (r && typeof r === 'string') { updates.mother_id = r; resolvedMother++ }
      else if (r?.ambiguous) ambiguous.push({ memberId: l.member_id, type: 'mãe', name: motherName })
      else if (codes.mother_legacy_code) unresolved.push({ memberId: l.member_id, type: 'mãe', name: motherName })
    }

    if (Object.keys(updates).length > 0 && !DRY_RUN) {
      const { error } = await supabase
        .from('member_family')
        .upsert({ member_id: l.member_id, ...updates })
      if (error) {
        console.warn(`  ⚠️  Erro ao atualizar member_family de ${l.member_id}: ${error.message}`)
      }
    }
  }

  console.log('\n' + '='.repeat(70))
  console.log('  RESULTADO')
  console.log('='.repeat(70))
  console.log(`  Cônjuges vinculados:  ${resolvedSpouse}`)
  console.log(`  Pais vinculados:      ${resolvedFather}`)
  console.log(`  Mães vinculadas:      ${resolvedMother}`)
  console.log(`  TOTAL vinculados:     ${resolvedSpouse + resolvedFather + resolvedMother}`)
  console.log()
  console.log(`  Nomes ambíguos (mesmo nome 2x+ no banco): ${ambiguous.length}`)
  console.log(`    → não vinculados pra evitar erro, manter texto livre`)
  console.log(`  Não encontrados (provavelmente não estão cadastrados): ${unresolved.length}`)

  if (ambiguous.length > 0 && ambiguous.length <= 10) {
    console.log('\n  Ambíguos:')
    for (const a of ambiguous) console.log(`    membro ${a.memberId} ${a.type}: "${a.name}"`)
  }

  if (DRY_RUN) {
    console.log('\n🧪 DRY-RUN: Nenhuma alteração foi salva.')
  } else {
    console.log('\n✅ Vínculos familiares resolvidos.')
  }
}

main().catch(e => {
  console.error('\n💥 Erro fatal:', e.message)
  process.exit(1)
})
