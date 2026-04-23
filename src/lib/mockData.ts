import type { Church, ChurchGroup, Member, AppUser, Seminario, Matricula, Carteirinha, Certificado } from '../types'

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
const nicknames = ['Juninho', 'Nanda', 'Kaká', 'Bia', 'Dé', 'Léo', 'Paulinho', 'Lu', 'Carlão', 'Má', 'Rafa', 'Gabi', 'Edu', 'Pati']
const naturalidades = ['Piracanjuba-GO', 'Goiânia-GO', 'Hidrolândia-GO', 'Morrinhos-GO', 'Goiatuba-GO', 'Anápolis-GO', 'Aparecida de Goiânia-GO', 'Uberlândia-MG', 'Brasília-DF', 'São Paulo-SP']
const nacionalidades = ['Brasil', 'Brasil', 'Brasil', 'Brasil', 'Brasil', 'Brasil', 'Portugal', 'Argentina', 'Paraguai']
const bairros = ['Centro', 'Setor Norte', 'Setor Sul', 'Jardim América', 'Vila Nova', 'Setor Aeroporto', 'Residencial Parque', 'Setor Bela Vista']
const logradouros = ['Rua das Acácias', 'Av. Brasil', 'Rua dos Pinheiros', 'Av. Goiás', 'Rua das Flores', 'Rua Principal', 'Av. Central', 'Rua do Comércio']
const statuses: Member['status'][] = ['ativo', 'ativo', 'ativo', 'ativo', 'inativo', 'indisponivel']
const civilStatuses: Member['civil_status'][] = ['solteiro', 'casado', 'casado', 'solteiro', 'viuvo', 'divorciado']
const titles = ['Pastor', 'Presbítero', 'Diácono', 'Membro', 'Evangelista', 'Obreiro', 'Cooperador']
const entryReasons = ['Batismo', 'Transferência', 'Adesão', 'Conversão', 'Profissão de Fé']
const exitReasons = ['Transferência', 'Mudança de cidade', 'Falecimento', 'Afastamento']

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
  const civil = randomItem(civilStatuses)
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
  const isMarried = civil === 'casado' || civil === 'uniao_estavel'
  const hasKids = isMarried && Math.random() > 0.4
  const kidsCount = hasKids ? Math.floor(Math.random() * 3) + 1 : 0
  const hasApelido = Math.random() > 0.6
  const hasExit = status === 'inativo' && Math.random() > 0.5
  const exitDate = hasExit ? randomDate(new Date(entryDate), new Date()) : undefined
  const cidade = randomItem(['Piracanjuba', 'Hidrolândia', 'Goiatuba', 'Morrinhos', 'Goiânia'])
  const bairro = randomItem(bairros)

  return {
    id: `member-${i + 1}`,
    church_id: church.id,
    member_type: 'membro',
    status,
    name,
    apelido: hasApelido ? randomItem(nicknames) : undefined,
    sex,
    birth_date: birthDate,
    civil_status: civil,
    nationality: randomItem(nacionalidades),
    naturalidade: randomItem(naturalidades),
    cpf: `${Math.floor(Math.random() * 900 + 100)}.${Math.floor(Math.random() * 900 + 100)}.${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 90 + 10)}`,
    identity: `${Math.floor(Math.random() * 9000000 + 1000000)} SSP-GO`,
    schooling: randomItem(['Ensino Fundamental Completo', 'Ensino Médio Completo', 'Ensino Superior Completo', 'Pós-graduação', 'Mestrado']),
    occupation: randomItem(['Agricultor', 'Professor', 'Comerciante', 'Estudante', 'Aposentado', 'Empresário', 'Funcionário Público', 'Pedreiro', 'Costureira', 'Motorista']),
    entry_date: entryDate,
    entry_reason: randomItem(entryReasons),
    exit_date: exitDate,
    exit_reason: hasExit ? randomItem(exitReasons) : undefined,
    origin_church: Math.random() > 0.6 ? randomItem(['AD Belém', 'AD Madureira', 'Batista Central', 'IEADP Goiânia']) : undefined,
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
      cellphone1: formatPhone(),
      cep: `${Math.floor(Math.random() * 90000 + 10000)}-${Math.floor(Math.random() * 900 + 100)}`,
      address: `${randomItem(logradouros)}`,
      number: String(Math.floor(Math.random() * 2000 + 1)),
      complement: Math.random() > 0.7 ? `Apto ${Math.floor(Math.random() * 200 + 1)}` : undefined,
      neighborhood: bairro,
      city: cidade,
      state: 'GO',
      country: 'Brasil',
    },
    family: {
      member_id: `member-${i + 1}`,
      father_name: Math.random() > 0.3 ? `${randomItem(firstNames.filter(n => !['Maria', 'Ana', 'Fernanda', 'Juliana', 'Camila', 'Beatriz', 'Larissa', 'Patrícia', 'Vanessa', 'Sandra', 'Daniela', 'Cristiane', 'Elaine', 'Adriana', 'Luciana'].includes(n)))} ${randomItem(lastNames)} ${randomItem(lastNames)}` : undefined,
      mother_name: Math.random() > 0.3 ? `${randomItem(['Maria', 'Ana', 'Fernanda', 'Juliana', 'Camila', 'Beatriz', 'Larissa', 'Patrícia', 'Vanessa', 'Sandra', 'Daniela', 'Cristiane', 'Elaine', 'Adriana', 'Luciana'])} ${randomItem(lastNames)} ${randomItem(lastNames)}` : undefined,
      spouse_name: isMarried ? `${randomItem(firstNames)} ${randomItem(lastNames)}` : undefined,
      wedding_date: isMarried ? randomDate(new Date(1990, 0, 1), new Date(2023, 0, 1)) : undefined,
      children: Array.from({ length: kidsCount }, (_, j) => ({
        id: `child-${i}-${j}`,
        name: `${randomItem(firstNames)} ${randomItem(lastNames)}`,
        birth_date: randomDate(new Date(2005, 0, 1), new Date(2020, 0, 1)),
      })),
    },
    ministry: {
      member_id: `member-${i + 1}`,
      titles: [randomItem(titles)],
      ministries: Math.random() > 0.5 ? [randomItem(['Louvor', 'Intercessão', 'Evangelismo', 'Diaconia'])] : [],
      departments: Math.random() > 0.6 ? [randomItem(['Infantil', 'Jovens', 'Senhoras', 'Homens'])] : [],
      functions: Math.random() > 0.7 ? [randomItem(['Tesoureiro', 'Secretário', 'Coordenador'])] : [],
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

// ── Seminários ────────────────────────────────────────────────────────────
export const mockSeminarios: Seminario[] = [
  {
    id: 'sem-1',
    nome: 'Escola Bíblica Básica',
    descricao: 'Curso introdutório de teologia e doutrinas cristãs fundamentais.',
    instrutor: 'Pastor João Silva',
    data_inicio: `${currentYear}-02-01`,
    data_fim: `${currentYear}-06-30`,
    carga_horaria: 80,
    local: 'Templo Sede',
    church_id: 'ch-1',
    status: 'em_andamento',
    created_at: `${currentYear}-01-15T10:00:00Z`,
    updated_at: `${currentYear}-01-15T10:00:00Z`,
  },
  {
    id: 'sem-2',
    nome: 'Seminário de Evangelismo',
    descricao: 'Preparação para obra evangelística e missões.',
    instrutor: 'Evangelista Carlos Alves',
    data_inicio: `${currentYear}-03-10`,
    data_fim: `${currentYear}-05-10`,
    carga_horaria: 40,
    local: 'Templo Sede',
    church_id: 'ch-1',
    status: 'em_andamento',
    created_at: `${currentYear}-02-20T10:00:00Z`,
    updated_at: `${currentYear}-02-20T10:00:00Z`,
  },
  {
    id: 'sem-3',
    nome: 'Discipulado 1',
    descricao: 'Formação para novos convertidos.',
    instrutor: 'Presbítero Pedro Souza',
    data_inicio: `${currentYear - 1}-08-01`,
    data_fim: `${currentYear - 1}-12-15`,
    carga_horaria: 60,
    local: 'Templo Sede',
    church_id: 'ch-1',
    status: 'concluido',
    created_at: `${currentYear - 1}-07-10T10:00:00Z`,
    updated_at: `${currentYear - 1}-12-20T10:00:00Z`,
  },
  {
    id: 'sem-4',
    nome: 'Curso de Louvor e Adoração',
    descricao: 'Formação de ministros de louvor.',
    instrutor: 'Ministra Ana Santos',
    data_inicio: `${currentYear}-07-01`,
    carga_horaria: 50,
    local: 'Templo Sede',
    church_id: 'ch-1',
    status: 'planejado',
    created_at: `${currentYear}-04-01T10:00:00Z`,
    updated_at: `${currentYear}-04-01T10:00:00Z`,
  },
]

// Matrículas: metade reaproveita membros, metade é avulsa
export const mockMatriculas: Matricula[] = [
  // Seminário 1 - Escola Bíblica Básica (em andamento)
  ...mockMembers.slice(0, 8).map((m, i): Matricula => ({
    id: `mat-${i + 1}`,
    seminario_id: 'sem-1',
    member_id: m.id,
    nome: m.name,
    apelido: m.apelido,
    cpf: m.cpf,
    birth_date: m.birth_date,
    sex: m.sex,
    email: m.contacts?.emails?.[0],
    telefone: m.contacts?.phones?.[0] ?? m.contacts?.cellphone1,
    cidade: m.contacts?.city,
    estado: m.contacts?.state,
    church_id: m.church_id,
    situacao: 'cursando',
    frequencia: Math.floor(60 + Math.random() * 40),
    data_matricula: `${currentYear}-01-25`,
    created_at: `${currentYear}-01-25T10:00:00Z`,
    updated_at: `${currentYear}-01-25T10:00:00Z`,
  })),
  // 2 alunos avulsos no seminário 1
  {
    id: 'mat-9',
    seminario_id: 'sem-1',
    nome: 'Rebeca Campos Dias',
    cpf: '123.456.789-00',
    birth_date: '1995-05-12',
    sex: 'feminino',
    email: 'rebeca@email.com',
    telefone: '(64) 99999-0001',
    cidade: 'Piracanjuba',
    estado: 'GO',
    situacao: 'cursando',
    frequencia: 95,
    data_matricula: `${currentYear}-01-28`,
    created_at: `${currentYear}-01-28T10:00:00Z`,
    updated_at: `${currentYear}-01-28T10:00:00Z`,
  },
  {
    id: 'mat-10',
    seminario_id: 'sem-1',
    nome: 'Tiago Barros Almeida',
    cpf: '987.654.321-00',
    birth_date: '1988-11-20',
    sex: 'masculino',
    telefone: '(64) 99999-0002',
    cidade: 'Goiatuba',
    estado: 'GO',
    situacao: 'cursando',
    frequencia: 85,
    data_matricula: `${currentYear}-02-01`,
    created_at: `${currentYear}-02-01T10:00:00Z`,
    updated_at: `${currentYear}-02-01T10:00:00Z`,
  },
  // Seminário 2 - Evangelismo
  ...mockMembers.slice(8, 13).map((m, i): Matricula => ({
    id: `mat-${11 + i}`,
    seminario_id: 'sem-2',
    member_id: m.id,
    nome: m.name,
    apelido: m.apelido,
    cpf: m.cpf,
    birth_date: m.birth_date,
    sex: m.sex,
    email: m.contacts?.emails?.[0],
    telefone: m.contacts?.phones?.[0],
    cidade: m.contacts?.city,
    estado: m.contacts?.state,
    church_id: m.church_id,
    situacao: 'cursando',
    frequencia: Math.floor(70 + Math.random() * 30),
    data_matricula: `${currentYear}-03-05`,
    created_at: `${currentYear}-03-05T10:00:00Z`,
    updated_at: `${currentYear}-03-05T10:00:00Z`,
  })),
  // Seminário 3 - Discipulado 1 (concluído) com notas
  ...mockMembers.slice(13, 20).map((m, i): Matricula => {
    const reprovado = i === 6
    const desistente = i === 5
    return {
      id: `mat-${16 + i}`,
      seminario_id: 'sem-3',
      member_id: m.id,
      nome: m.name,
      apelido: m.apelido,
      cpf: m.cpf,
      birth_date: m.birth_date,
      sex: m.sex,
      email: m.contacts?.emails?.[0],
      telefone: m.contacts?.phones?.[0],
      cidade: m.contacts?.city,
      estado: m.contacts?.state,
      church_id: m.church_id,
      situacao: desistente ? 'desistente' : reprovado ? 'reprovado' : 'concluido',
      nota_final: desistente ? undefined : reprovado ? 4.5 : +(7 + Math.random() * 3).toFixed(1),
      frequencia: desistente ? 30 : reprovado ? 55 : Math.floor(80 + Math.random() * 20),
      data_matricula: `${currentYear - 1}-07-25`,
      data_conclusao: desistente || reprovado ? undefined : `${currentYear - 1}-12-15`,
      created_at: `${currentYear - 1}-07-25T10:00:00Z`,
      updated_at: `${currentYear - 1}-12-20T10:00:00Z`,
    }
  }),
]

// ── Carteirinhas ──────────────────────────────────────────────────────────
export const mockCarteirinhas: Carteirinha[] = mockMembers.slice(0, 15).map((m, i) => {
  const emitidaEm = randomDate(new Date(currentYear - 2, 0, 1), new Date())
  const validaAte = new Date(emitidaEm)
  validaAte.setFullYear(validaAte.getFullYear() + 2)
  const hoje = new Date()
  const vencida = validaAte < hoje
  return {
    id: `cart-${i + 1}`,
    member_id: m.id,
    numero: `ADP-${currentYear}-${String(i + 1).padStart(4, '0')}`,
    motivo: i === 0 ? 'renovacao' : i === 1 ? 'segunda_via' : 'primeira_via',
    emitida_em: emitidaEm,
    valida_ate: validaAte.toISOString().split('T')[0],
    emitida_por: 'Secretaria Admin',
    status: vencida ? 'vencida' : 'ativa',
    created_at: emitidaEm + 'T10:00:00Z',
  }
})

// ── Certificados ──────────────────────────────────────────────────────────
export const mockCertificados: Certificado[] = mockMatriculas
  .filter(m => m.situacao === 'concluido')
  .map((m, i) => {
    const seminario = mockSeminarios.find(s => s.id === m.seminario_id)!
    const emitidaEm = m.data_conclusao ?? `${currentYear - 1}-12-20`
    return {
      id: `cert-${i + 1}`,
      matricula_id: m.id,
      seminario_id: m.seminario_id,
      numero: `CERT-${currentYear - 1}-${String(i + 1).padStart(4, '0')}`,
      nome_aluno: m.nome,
      nome_seminario: seminario.nome,
      carga_horaria: seminario.carga_horaria,
      data_conclusao: emitidaEm,
      emitido_em: emitidaEm,
      emitido_por: 'Secretaria Admin',
      status: 'emitido',
      created_at: emitidaEm + 'T10:00:00Z',
    }
  })
