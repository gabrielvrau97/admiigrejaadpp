import { supabase } from '../supabase'
import type { Member, MemberContact, MemberFamily, MemberMinistry, FamilyChild } from '../../types'

const MEMBER_COLUMNS = `
  id, church_id, member_type, status, name, apelido, sex, birth_date, civil_status,
  nationality, naturalidade, cpf, identity, schooling, occupation, code,
  entry_date, entry_reason, entry_reason_other, origin_church, how_arrived, how_arrived_other,
  novo_convertido, exit_date, exit_reason, exit_reason_other,
  baptism, baptism_date, baptism_spirit, baptism_spirit_date, conversion, conversion_date,
  imprimir_credencial,
  notes, created_at, updated_at,
  church:churches!church_id ( id, group_id, name, type, address, phone, email, logo_url ),
  contacts:member_contacts!member_contacts_member_id_fkey ( emails, phones, cellphone1, cep, address, number, complement, neighborhood, city, state, country ),
  family:member_family!member_family_member_id_fkey ( spouse_id, spouse_name, spouse_birth_date, wedding_date, father_id, father_name, mother_id, mother_name ),
  ministry:member_ministry!member_ministry_member_id_fkey ( titles, ministries, departments, functions, companion, companion_id, discipler_id ),
  children:member_children!member_children_parent_id_fkey ( id, name, birth_date )
`

interface RawMember extends Omit<Member, 'contacts' | 'family' | 'ministry' | 'church'> {
  church?: Member['church']
  contacts?: MemberContact | MemberContact[] | null
  family?: MemberFamily | MemberFamily[] | null
  ministry?: MemberMinistry | MemberMinistry[] | null
  children?: FamilyChild[] | null
}

function pickFirst<T>(v: T | T[] | null | undefined): T | undefined {
  if (!v) return undefined
  return Array.isArray(v) ? v[0] : v
}

function normalize(raw: RawMember): Member {
  const family = pickFirst(raw.family) ?? {}
  const ministry = pickFirst(raw.ministry) ?? {}
  const contacts = pickFirst(raw.contacts) ?? {}
  const children = (raw.children ?? []) as FamilyChild[]
  return {
    ...raw,
    contacts: contacts as MemberContact,
    ministry: ministry as MemberMinistry,
    family: { ...(family as MemberFamily), children },
  } as Member
}

export async function listMembers(): Promise<Member[]> {
  const { data, error } = await supabase
    .from('members')
    .select(MEMBER_COLUMNS)
    .neq('status', 'deleted')
    .order('name', { ascending: true })
  if (error) throw error
  return (data ?? []).map(r => normalize(r as unknown as RawMember))
}

export async function getMember(id: string): Promise<Member | null> {
  const { data, error } = await supabase
    .from('members')
    .select(MEMBER_COLUMNS)
    .eq('id', id)
    .single()
  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return normalize(data as unknown as RawMember)
}

// ── Helpers de divisão (separar Member em pedaços por tabela) ──────────────

// Campos do members que são DATE no banco — strings vazias precisam virar null
const DATE_FIELDS = new Set([
  'birth_date', 'entry_date', 'exit_date',
  'baptism_date', 'baptism_spirit_date', 'conversion_date',
])

// Limpa string vazia → null em campos opcionais (Postgres rejeita "" em date/uuid)
function cleanEmpties<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === '' || v === undefined) {
      // se for campo de data ou termina em _id (uuid), null. senão pula
      if (DATE_FIELDS.has(k) || k === 'id' || k.endsWith('_id')) {
        out[k] = null
      }
      // strings vazias em outros campos: pula (deixa Postgres usar default)
    } else {
      out[k] = v
    }
  }
  return out as T
}

function splitMember(m: Partial<Member>) {
  // remove campos que não pertencem a members (joins read-only) e id vazio
  const mAny = m as Partial<Member> & { children?: unknown }
  const { contacts, family, ministry, church, id, created_at, updated_at, children: rootChildren, ...rest } = mAny
  void church; void created_at; void updated_at; void rootChildren  // descartados (vem do select com joins)
  const base = cleanEmpties({
    ...(id ? { id } : {}),  // só inclui id se foi passado de verdade
    ...rest,
  } as Record<string, unknown>)

  const familyChildren = family?.children ?? undefined
  const { children: _omit, member_id: _mid, ...familyOnly } = (family ?? {}) as Partial<typeof family> & { children?: unknown; member_id?: string }
  void _mid; void _omit

  return {
    base,
    contacts: contacts && Object.keys(contacts).length
      ? cleanEmpties(stripMemberId(contacts))
      : null,
    family: Object.keys(familyOnly).length
      ? cleanEmpties(familyOnly as Record<string, unknown>)
      : null,
    ministry: ministry && Object.keys(ministry).length
      ? cleanEmpties(stripMemberId(ministry))
      : null,
    children: familyChildren,
  }
}

// Remove member_id que pode vir nos joins quando vem do banco
function stripMemberId<T extends { member_id?: string }>(obj: T): Omit<T, 'member_id'> {
  const { member_id: _omit, ...rest } = obj
  void _omit
  return rest
}

// ── CRUD ────────────────────────────────────────────────────────────────────

export async function createMember(m: Partial<Member>): Promise<Member> {
  const { base, contacts, family, ministry, children } = splitMember(m)
  const { data, error } = await supabase
    .from('members')
    .insert(base)
    .select('id')
    .single()
  if (error) throw error
  const memberId = (data as { id: string }).id

  if (contacts && Object.keys(contacts).length) {
    await supabase.from('member_contacts').upsert({ member_id: memberId, ...contacts })
  }
  if (family && Object.keys(family).length) {
    await supabase.from('member_family').upsert({ member_id: memberId, ...family })
  }
  if (ministry && Object.keys(ministry).length) {
    await supabase.from('member_ministry').upsert({ member_id: memberId, ...ministry })
  }
  if (children && children.length) {
    const rows = children.map(c => ({ parent_id: memberId, name: c.name, birth_date: c.birth_date ?? null }))
    await supabase.from('member_children').insert(rows)
  }

  const fresh = await getMember(memberId)
  if (!fresh) throw new Error('Falha ao recarregar membro recém-criado')
  return fresh
}

export async function updateMember(id: string, patch: Partial<Member>): Promise<Member> {
  const { base, contacts, family, ministry, children } = splitMember(patch)
  // Não atualiza a PK
  const { id: _omit, ...baseNoId } = base as Record<string, unknown>
  void _omit

  if (Object.keys(baseNoId).length) {
    const { error } = await supabase.from('members').update(baseNoId).eq('id', id)
    if (error) throw error
  }
  if (contacts) {
    await supabase.from('member_contacts').upsert({ member_id: id, ...contacts })
  }
  if (family) {
    await supabase.from('member_family').upsert({ member_id: id, ...family })
  }
  if (ministry) {
    await supabase.from('member_ministry').upsert({ member_id: id, ...ministry })
  }
  if (children) {
    // Estratégia simples: apaga e recria. Como é só pra filhos, custo é baixo.
    await supabase.from('member_children').delete().eq('parent_id', id)
    if (children.length) {
      const rows = children.map(c => ({ parent_id: id, name: c.name, birth_date: c.birth_date ?? null }))
      await supabase.from('member_children').insert(rows)
    }
  }
  const fresh = await getMember(id)
  if (!fresh) throw new Error('Falha ao recarregar membro')
  return fresh
}

// Soft delete — marca status='deleted'
export async function softDeleteMember(id: string): Promise<void> {
  const { error } = await supabase.from('members').update({ status: 'deleted' }).eq('id', id)
  if (error) throw error
}
