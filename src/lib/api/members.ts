import { supabase } from '../supabase'
import type { Member, MemberContact, MemberFamily, MemberMinistry, FamilyChild } from '../../types'

const MEMBER_COLUMNS = `
  id, church_id, member_type, status, name, apelido, sex, birth_date, civil_status,
  nationality, naturalidade, cpf, identity, schooling, occupation, code,
  entry_date, entry_reason, entry_reason_other, origin_church, how_arrived, how_arrived_other,
  novo_convertido, exit_date, exit_reason, exit_reason_other,
  baptism, baptism_date, baptism_spirit, baptism_spirit_date, conversion, conversion_date,
  notes, created_at, updated_at,
  church:churches!church_id ( id, group_id, name, type, address, phone, email, logo_url ),
  contacts:member_contacts!member_contacts_member_id_fkey ( emails, phones, cellphone1, cep, address, number, complement, neighborhood, city, state, country ),
  family:member_family!member_family_member_id_fkey ( spouse_id, spouse_name, spouse_birth_date, wedding_date, father_id, father_name, mother_id, mother_name ),
  ministry:member_ministry!member_ministry_member_id_fkey ( titles, ministries, departments, functions, companion, discipler_id ),
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

function splitMember(m: Partial<Member>) {
  const { contacts, family, ministry, church, ...base } = m
  // família: separar children pra outra tabela
  const familyChildren = family?.children ?? undefined
  const { children: _omit, ...familyOnly } = family ?? {}
  return {
    base,
    contacts: contacts ?? null,
    family: Object.keys(familyOnly).length ? familyOnly : null,
    ministry: ministry ?? null,
    children: familyChildren,
  }
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

  if (Object.keys(base).length) {
    const { error } = await supabase.from('members').update(base).eq('id', id)
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
