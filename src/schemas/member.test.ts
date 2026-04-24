import { describe, it, expect } from 'vitest'
import { isValidCPF, memberFormSchema } from './member'

describe('isValidCPF', () => {
  it('aceita CPFs válidos com máscara', () => {
    expect(isValidCPF('529.982.247-25')).toBe(true)
    expect(isValidCPF('111.444.777-35')).toBe(true)
  })

  it('aceita CPFs válidos sem máscara', () => {
    expect(isValidCPF('52998224725')).toBe(true)
    expect(isValidCPF('11144477735')).toBe(true)
  })

  it('rejeita CPFs com dígito verificador errado', () => {
    expect(isValidCPF('529.982.247-24')).toBe(false)
    expect(isValidCPF('111.444.777-00')).toBe(false)
  })

  it('rejeita CPFs com menos de 11 dígitos', () => {
    expect(isValidCPF('123')).toBe(false)
    expect(isValidCPF('')).toBe(false)
  })

  it('rejeita CPFs com todos os dígitos iguais', () => {
    expect(isValidCPF('111.111.111-11')).toBe(false)
    expect(isValidCPF('00000000000')).toBe(false)
    expect(isValidCPF('99999999999')).toBe(false)
  })
})

describe('memberFormSchema', () => {
  it('exige nome', () => {
    const result = memberFormSchema.safeParse({ status: 'ativo' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some(i => i.path[0] === 'name')).toBe(true)
    }
  })

  it('aceita membro mínimo válido', () => {
    const result = memberFormSchema.safeParse({
      name: 'João Silva',
      status: 'ativo',
    })
    expect(result.success).toBe(true)
  })

  it('rejeita CPF inválido', () => {
    const result = memberFormSchema.safeParse({
      name: 'João Silva',
      status: 'ativo',
      cpf: '123.456.789-00',
    })
    expect(result.success).toBe(false)
  })

  it('aceita CPF vazio (opcional)', () => {
    const result = memberFormSchema.safeParse({
      name: 'João Silva',
      status: 'ativo',
      cpf: '',
    })
    expect(result.success).toBe(true)
  })

  it('aceita CPF válido', () => {
    const result = memberFormSchema.safeParse({
      name: 'João Silva',
      status: 'ativo',
      cpf: '529.982.247-25',
    })
    expect(result.success).toBe(true)
  })
})
