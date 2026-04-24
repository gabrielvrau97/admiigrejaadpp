import { describe, it, expect } from 'vitest'
import {
  calcularValidadeCarteirinha,
  gerarNumeroSequencial,
  carteirinhaGerarSchema,
} from './carteirinha'

describe('calcularValidadeCarteirinha', () => {
  it('adiciona 2 anos à data de emissão', () => {
    expect(calcularValidadeCarteirinha('2026-04-24', 2)).toBe('2028-04-24')
  })

  it('funciona com 1 ano', () => {
    expect(calcularValidadeCarteirinha('2026-04-24', 1)).toBe('2027-04-24')
  })

  it('funciona com 5 anos', () => {
    expect(calcularValidadeCarteirinha('2026-01-15', 5)).toBe('2031-01-15')
  })

  it('respeita anos bissextos', () => {
    // 29/02/2024 é bissexto; +1 ano cai em 01/03/2025 (pois 2025 não é bissexto)
    expect(calcularValidadeCarteirinha('2024-02-29', 1)).toBe('2025-03-01')
  })

  it('mantém o dia quando não há problema de mês', () => {
    expect(calcularValidadeCarteirinha('2026-12-31', 2)).toBe('2028-12-31')
  })
})

describe('gerarNumeroSequencial', () => {
  it('formata com prefixo, ano e sequencial padded', () => {
    expect(gerarNumeroSequencial('ADP', 2026, 1)).toBe('ADP-2026-0001')
    expect(gerarNumeroSequencial('ADP', 2026, 42)).toBe('ADP-2026-0042')
    expect(gerarNumeroSequencial('CERT', 2025, 999)).toBe('CERT-2025-0999')
  })

  it('funciona com sequenciais maiores que 4 dígitos', () => {
    expect(gerarNumeroSequencial('ADP', 2026, 12345)).toBe('ADP-2026-12345')
  })
})

describe('carteirinhaGerarSchema', () => {
  it('aceita input válido', () => {
    const result = carteirinhaGerarSchema.safeParse({
      member_id: 'member-1',
      motivo: 'primeira_via',
      validade_anos: 2,
    })
    expect(result.success).toBe(true)
  })

  it('rejeita member_id vazio', () => {
    const result = carteirinhaGerarSchema.safeParse({
      member_id: '',
      motivo: 'primeira_via',
      validade_anos: 2,
    })
    expect(result.success).toBe(false)
  })

  it('rejeita validade acima de 10 anos', () => {
    const result = carteirinhaGerarSchema.safeParse({
      member_id: 'member-1',
      motivo: 'primeira_via',
      validade_anos: 15,
    })
    expect(result.success).toBe(false)
  })

  it('rejeita motivo inválido', () => {
    const result = carteirinhaGerarSchema.safeParse({
      member_id: 'member-1',
      motivo: 'motivo_inexistente',
      validade_anos: 2,
    })
    expect(result.success).toBe(false)
  })
})
