import type { Church, ChurchGroup, Member, AppUser } from '../types'

export const mockGroup: ChurchGroup = {
  id: 'group-1',
  name: 'ADP Piracanjuba',
  created_at: '2020-01-01T00:00:00Z',
}

export const mockChurches: Church[] = [
  { id: 'ch-1', group_id: 'group-1', name: 'ADP SEDE', type: 'sede', address: 'Rua Principal, 100, Piracanjuba-GO', phone: '(64) 3465-0000', email: 'sede@adp.com' },
  { id: 'ch-2', group_id: 'group-1', name: 'ADP Bela Vista', type: 'filial', address: 'Rua das Flores, 50, Piracanjuba-GO' },
  { id: 'ch-3', group_id: 'group-1', name: 'ADP Trevo Floresta', type: 'filial', address: 'Av. Floresta, 200, Piracanjuba-GO' },
  { id: 'ch-4', group_id: 'group-1', name: 'ADP São José', type: 'filial', address: 'Rua São José, 75, Piracanjuba-GO' },
  { id: 'ch-5', group_id: 'group-1', name: 'ADP Serra Negra', type: 'filial', address: 'Estrada Serra Negra, Km 5, Piracanjuba-GO' },
  { id: 'ch-6', group_id: 'group-1', name: 'ADP Areia', type: 'filial', address: 'Comunidade Areia, Piracanjuba-GO' },
  { id: 'ch-7', group_id: 'group-1', name: 'ADP Integração', type: 'filial', address: 'Setor Integração, Piracanjuba-GO' },
  { id: 'ch-8', group_id: 'group-1', name: 'ADP Hidrolândia', type: 'filial', address: 'Rua Central, 30, Hidrolândia-GO' },
]

const firstNames = ['Maria', 'João', 'Ana', 'Pedro', 'Luciana', 'Carlos', 'Fernanda', 'José', 'Juliana', 'Marcos', 'Camila', 'Paulo', 'Beatriz', 'Lucas', 'Larissa', 'Rafael', 'Patrícia', 'André', 'Vanessa', 'Felipe', 'Sandra', 'Eduardo', 'Daniela', 'Roberto', 'Cristiane', 'Rodrigo', 'Elaine', 'Diego', 'Adriana', 'Leonardo']
const lastNames = ['Silva', 'Souza', 'Oliveira', 'Santos', 'Costa', 'Ferreira', 'Alves', 'Pereira', 'Rodrigues', 'Lima', 'Martins', 'Carvalho', 'Ribeiro', 'Gomes', 'Araújo', 'Moreira', 'Nunes', 'Barbosa', 'Cardoso', 'Mendes']
const statuses: Member['status'][] = ['ativo', 'ativo', 'ativo', 'ativo', 'inativo', 'indisponivel']
const civilStatuses: Member['civil_status'][] = ['solteiro', 'casado', 'casado', 'solteiro', 'viuvo', 'divorciado']
const titles = ['Pastor', 'Presbítero', 'Diácono', 'Membro', 'Evangelista', 'Obreiro', 'Cooperador']
const entryReasons = ['Batismo', 'Transferência', 'Adesão', 'Conversão', 'Profissão de Fé']

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomDate(start: Date, end: Date): string {
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
  return d.toISOString().split('T')[0]
}

function formatPhone(): string {
  const ddd = ['62', '64', '61', '11', '21'][Math.floor(Math.random() * 5)]
  const n = Math.floor(Math.random() * 900000000 + 100000000)
  return `(${ddd}) 9${String(n).slice(0, 4)}-${String(n).slice(4, 8)}`
}

const currentYear = new Date().getFullYear()

function randomDateInYear(year: number): string {
  return randomDate(new Date(year, 0, 1), new Date(year, 11, 31))
}

export const mockMembers: Member[] = Array.from({ length: 60 }, (_, i) => {
  const sex: Member['sex'] = i % 2 === 0 ? 'masculino' : 'feminino'
  const fn = randomItem(firstNames)
  const ln = `${randomItem(lastNames)} ${randomItem(lastNames)}`
  const name = `${fn} ${ln}`
  const status = randomItem(statuses)
  const churchIdx = Math.floor(Math.random() * mockChurches.length)
  const church = mockChurches[churchIdx]
  const birthDate = randomDate(new Date(1950, 0, 1), new Date(2010, 0, 1))
  // spread entry dates across past years including current year
  const entryYear = currentYear - Math.floor(Math.random() * 8)
  const entryDate = entryYear === currentYear
    ? randomDate(new Date(currentYear, 0, 1), new Date())
    : randomDateInYear(entryYear)
  const baptism = Math.random() > 0.3
  // spread baptism dates across recent years for annual comparison
  const baptismYear = currentYear - Math.floor(Math.random() * 5)
  const baptismDate = baptism
    ? (baptismYear === currentYear
        ? randomDate(new Date(currentYear, 0, 1), new Date())
        : randomDateInYear(baptismYear))
    : undefined
  const conversion = Math.random() > 0.4

  return {
    id: `member-${i + 1}`,
    church_id: church.id,
    member_type: 'membro',
    status,
    name,
    sex,
    birth_date: birthDate,
    civil_status: randomItem(civilStatuses),
    nationality: 'Brasil',
    cpf: `${Math.floor(Math.random() * 900 + 100)}.${Math.floor(Math.random() * 900 + 100)}.${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 90 + 10)}`,
    schooling: randomItem(['Fundamental', 'Médio', 'Superior', 'Pós-graduação']),
    occupation: randomItem(['Agricultor', 'Professor', 'Comerciante', 'Estudante', 'Aposentado', 'Empresário', 'Funcionário Público']),
    entry_date: entryDate,
    entry_reason: randomItem(entryReasons),
    baptism,
    baptism_date: baptismDate,
    baptism_spirit: Math.random() > 0.4,
    conversion,
    conversion_date: conversion ? randomDate(new Date(2000, 0, 1), new Date(2022, 0, 1)) : undefined,
    created_at: entryDate + 'T00:00:00Z',
    updated_at: new Date().toISOString(),
    church,
    contacts: {
      member_id: `member-${i + 1}`,
      emails: [`${fn.toLowerCase()}.${ln.split(' ')[0].toLowerCase()}@email.com`],
      phones: [formatPhone()],
      city: randomItem(['Piracanjuba', 'Hidrolândia', 'Goiatuba', 'Morrinhos']),
      state: 'GO',
      country: 'Brasil',
    },
    ministry: {
      member_id: `member-${i + 1}`,
      titles: [randomItem(titles)],
      ministries: Math.random() > 0.5 ? [randomItem(['Louvor', 'Intercessão', 'Evangelismo', 'Diaconia'])] : [],
      departments: [],
      functions: [],
    },
  }
})

export const mockVisitantes: Member[] = Array.from({ length: 20 }, (_, i) => {
  const fn = randomItem(firstNames)
  const ln = randomItem(lastNames)
  const name = `${fn} ${ln}`
  const churchIdx = Math.floor(Math.random() * mockChurches.length)
  const church = mockChurches[churchIdx]
  const entryYear = currentYear - Math.floor(Math.random() * 2)
  const entryDate = entryYear === currentYear
    ? randomDate(new Date(currentYear, 0, 1), new Date())
    : randomDateInYear(entryYear)

  return {
    id: `visitor-${i + 1}`,
    church_id: church.id,
    member_type: 'visitante',
    status: Math.random() > 0.2 ? 'ativo' : 'inativo',
    name,
    sex: (i % 2 === 0 ? 'masculino' : 'feminino') as Member['sex'],
    birth_date: randomDate(new Date(1970, 0, 1), new Date(2005, 0, 1)),
    civil_status: randomItem(civilStatuses),
    nationality: 'Brasil',
    entry_date: entryDate,
    created_at: entryDate + 'T00:00:00Z',
    updated_at: new Date().toISOString(),
    church,
    contacts: {
      phones: [formatPhone()],
      city: randomItem(['Piracanjuba', 'Hidrolândia', 'Goiatuba', 'Morrinhos']),
      state: 'GO',
      country: 'Brasil',
    },
  }
})

export const mockUser: AppUser = {
  id: 'user-1',
  email: 'secretaria@adp.com',
  role: 'admin',
  church_group_id: 'group-1',
  church_ids: mockChurches.map(c => c.id),
  name: 'Secretaria Admin',
}

const todayMMDD = new Date().toISOString().split('T')[0].slice(5)
export const mockBirthdays: Member[] = mockMembers.filter((_, i) => i < 3).map(m => ({
  ...m,
  birth_date: m.birth_date!.slice(0, 5) + todayMMDD,
}))
