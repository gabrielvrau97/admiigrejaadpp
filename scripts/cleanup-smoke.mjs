import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync(new URL('../.env', import.meta.url), 'utf8')
  .split('\n').filter(Boolean).reduce((acc, line) => {
    const [k, ...rest] = line.split('=')
    if (k) acc[k.trim()] = rest.join('=').trim()
    return acc
  }, {})

const [, , email, password] = process.argv
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })

await supabase.auth.signInWithPassword({ email, password })

// Apaga tudo que tenha "smoke" ou "Smoke" no nome
const { data: members } = await supabase.from('members').select('id, name').ilike('name', '%smoke%')
console.log('Membros encontrados:', members)
for (const m of members ?? []) {
  await supabase.from('member_contacts').delete().eq('member_id', m.id)
  await supabase.from('member_family').delete().eq('member_id', m.id)
  await supabase.from('member_ministry').delete().eq('member_id', m.id)
  await supabase.from('member_children').delete().eq('parent_id', m.id)
  await supabase.from('carteirinhas').delete().eq('member_id', m.id)
  // matriculas linkadas via member_id
  const { data: mats } = await supabase.from('matriculas').select('id').eq('member_id', m.id)
  for (const mat of mats ?? []) {
    await supabase.from('certificados').delete().eq('matricula_id', mat.id)
    await supabase.from('matriculas').delete().eq('id', mat.id)
  }
  await supabase.from('members').delete().eq('id', m.id)
  console.log('Apagado:', m.name)
}

const { data: sems } = await supabase.from('seminarios').select('id, nome').ilike('nome', '%smoke%')
for (const s of sems ?? []) {
  await supabase.from('matriculas').delete().eq('seminario_id', s.id)
  await supabase.from('seminarios').delete().eq('id', s.id)
  console.log('Seminário apagado:', s.nome)
}

console.log('✅ Cleanup OK')
