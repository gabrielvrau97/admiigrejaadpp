import { describe, it, expect } from 'vitest'
import {
  applySelectionFilters,
  applySimilarityFilters,
  EMPTY_SELECTION,
  EMPTY_SIMILARITY,
} from './AdvancedSearch'
import type { Member } from '../../types'

function makeMember(overrides: Partial<Member> = {}): Member {
  return {
    id: 'm-1',
    church_id: 'ch-1',
    status: 'ativo',
    name: 'João Silva',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('applySelectionFilters', () => {
  it('retorna todos quando filtros vazios', () => {
    const data = [makeMember(), makeMember({ id: 'm-2' })]
    expect(applySelectionFilters(data, EMPTY_SELECTION)).toHaveLength(2)
  })

  it('filtra por status', () => {
    const data = [
      makeMember({ id: 'm-1', status: 'ativo' }),
      makeMember({ id: 'm-2', status: 'inativo' }),
      makeMember({ id: 'm-3', status: 'ativo' }),
    ]
    const result = applySelectionFilters(data, { ...EMPTY_SELECTION, status: 'ativo' })
    expect(result).toHaveLength(2)
    expect(result.every(m => m.status === 'ativo')).toBe(true)
  })

  it('filtra por sexo', () => {
    const data = [
      makeMember({ id: 'm-1', sex: 'masculino' }),
      makeMember({ id: 'm-2', sex: 'feminino' }),
    ]
    const result = applySelectionFilters(data, { ...EMPTY_SELECTION, sexo: 'feminino' })
    expect(result).toHaveLength(1)
    expect(result[0].sex).toBe('feminino')
  })

  it('filtra por faixa etária', () => {
    const hoje = new Date()
    const anoAtual = hoje.getFullYear()
    const data = [
      makeMember({ id: 'jovem', birth_date: `${anoAtual - 20}-01-01` }),
      makeMember({ id: 'meia', birth_date: `${anoAtual - 40}-01-01` }),
      makeMember({ id: 'idoso', birth_date: `${anoAtual - 70}-01-01` }),
    ]
    const result = applySelectionFilters(data, { ...EMPTY_SELECTION, idade_min: '30', idade_max: '60' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('meia')
  })

  it('filtra por período de nascimento', () => {
    const data = [
      makeMember({ id: 'a', birth_date: '1990-05-15' }),
      makeMember({ id: 'b', birth_date: '2000-08-20' }),
      makeMember({ id: 'c', birth_date: '1985-03-10' }),
    ]
    const result = applySelectionFilters(data, {
      ...EMPTY_SELECTION,
      nascimento_de: '1988-01-01',
      nascimento_ate: '1999-12-31',
    })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('a')
  })

  it('filtra por convertido sim/não', () => {
    const data = [
      makeMember({ id: 'a', conversion: true }),
      makeMember({ id: 'b', conversion: false }),
      makeMember({ id: 'c', conversion: undefined }),
    ]
    expect(applySelectionFilters(data, { ...EMPTY_SELECTION, convertido: 'sim' })).toHaveLength(1)
    expect(applySelectionFilters(data, { ...EMPTY_SELECTION, convertido: 'nao' })).toHaveLength(2)
  })
})

describe('applySimilarityFilters', () => {
  it('retorna todos quando filtros vazios', () => {
    const data = [makeMember(), makeMember({ id: 'm-2', name: 'Maria' })]
    expect(applySimilarityFilters(data, EMPTY_SIMILARITY)).toHaveLength(2)
  })

  it('filtra por nome parcial case-insensitive', () => {
    const data = [
      makeMember({ id: 'a', name: 'João Silva' }),
      makeMember({ id: 'b', name: 'João Santos' }),
      makeMember({ id: 'c', name: 'Maria' }),
    ]
    const result = applySimilarityFilters(data, { ...EMPTY_SIMILARITY, nome: 'joão' })
    expect(result).toHaveLength(2)
  })

  it('filtra por apelido (bug histórico corrigido)', () => {
    const data = [
      makeMember({ id: 'a', apelido: 'Juninho' }),
      makeMember({ id: 'b', apelido: 'Bia' }),
      makeMember({ id: 'c' }), // sem apelido
    ]
    const result = applySimilarityFilters(data, { ...EMPTY_SIMILARITY, nome: '', apelido: 'jun' })
    expect(result).toHaveLength(1)
    expect(result[0].apelido).toBe('Juninho')
  })

  it('apelido vazio não filtra nada', () => {
    const data = [makeMember({ id: 'a' }), makeMember({ id: 'b', apelido: 'Bia' })]
    const result = applySimilarityFilters(data, EMPTY_SIMILARITY)
    expect(result).toHaveLength(2)
  })

  it('filtra por CPF ignorando máscara', () => {
    const data = [
      makeMember({ id: 'a', cpf: '529.982.247-25' }),
      makeMember({ id: 'b', cpf: '111.444.777-35' }),
    ]
    const result = applySimilarityFilters(data, { ...EMPTY_SIMILARITY, cpf: '52998' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('a')
  })

  it('filtra por celular em phones[] também', () => {
    const data = [
      makeMember({ id: 'a', contacts: { phones: ['(64) 99999-1234'] } }),
      makeMember({ id: 'b', contacts: { phones: ['(11) 98888-5678'] } }),
    ]
    const result = applySimilarityFilters(data, { ...EMPTY_SIMILARITY, celular: '99991234' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('a')
  })

  it('filtra por cidade', () => {
    const data = [
      makeMember({ id: 'a', contacts: { city: 'Piracanjuba' } }),
      makeMember({ id: 'b', contacts: { city: 'Goiânia' } }),
    ]
    const result = applySimilarityFilters(data, { ...EMPTY_SIMILARITY, cidade: 'pira' })
    expect(result).toHaveLength(1)
  })
})
