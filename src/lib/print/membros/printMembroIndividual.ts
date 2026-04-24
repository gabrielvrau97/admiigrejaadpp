import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Member } from '../../../types'
import { openPrintWindow } from '../../print'
import { parseISODate, getAge } from '../../format'

function civilLabel(cs?: string) {
  const map: Record<string, string> = {
    solteiro: 'Solteiro(a)', casado: 'Casado(a)',
    viuvo: 'Viúvo(a)', divorciado: 'Divorciado(a)', uniao_estavel: 'União Estável',
  }
  return cs ? (map[cs] ?? cs) : '—'
}

function fmtDateShort(d?: string): string {
  const parsed = parseISODate(d)
  if (!parsed) return '—'
  try { return format(parsed, 'dd/MM/yyyy') } catch { return d ?? '—' }
}

export function printMembroIndividual(m: Member) {
  const dateStr = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
  const age = getAge(m.birth_date)
  const statusTxt = m.status === 'ativo' ? 'Ativo' : m.status === 'inativo' ? 'Inativo' : m.status === 'indisponivel' ? 'Indisponível' : m.status === 'deleted' ? 'Excluído' : '—'
  const sexoTxt = m.sex === 'masculino' ? 'Masculino' : m.sex === 'feminino' ? 'Feminino' : '—'
  const filhos = m.family?.children?.length
    ? m.family.children.map(c => `${c.name}${c.birth_date ? ` (${fmtDateShort(c.birth_date)})` : ''}`).join(', ')
    : '—'

  const field = (label: string, value?: string | number | null) =>
    `<div class="field"><div class="lbl">${label}</div><div class="val">${value !== undefined && value !== null && value !== '' ? value : '—'}</div></div>`

  const section = (title: string, body: string) =>
    `<div class="section"><div class="section-title">${title}</div><div class="grid">${body}</div></div>`

  const ident = [
    field('Nome completo', m.name),
    field('Data de nascimento', fmtDateShort(m.birth_date)),
    field('Idade', age !== null ? `${age} anos` : '—'),
    field('Sexo', sexoTxt),
    field('Estado civil', civilLabel(m.civil_status)),
    field('Nacionalidade', m.nationality),
    field('Naturalidade', m.naturalidade),
    field('CPF', m.cpf),
    field('Identidade', m.identity),
    field('Escolaridade', m.schooling),
    field('Profissão', m.occupation),
    field('Código', m.code),
  ].join('')

  const contatos = [
    field('Celular 1', m.contacts?.cellphone1 ?? m.contacts?.phones?.[0]),
    field('Telefone / Celular 2', m.contacts?.phones?.[1]),
    field('E-mail 1', m.contacts?.emails?.[0]),
    field('E-mail 2', m.contacts?.emails?.[1]),
    field('CEP', m.contacts?.cep),
    field('Endereço', m.contacts?.address),
    field('Número', m.contacts?.number),
    field('Complemento', m.contacts?.complement),
    field('Bairro', m.contacts?.neighborhood),
    field('Cidade', m.contacts?.city),
    field('Estado', m.contacts?.state),
    field('País', m.contacts?.country ?? 'Brasil'),
  ].join('')

  const familia = [
    field('Cônjuge', m.family?.spouse_name),
    field('Nasc. cônjuge', fmtDateShort(m.family?.spouse_birth_date)),
    field('Data do casamento', fmtDateShort(m.family?.wedding_date)),
    field('Nome do pai', m.family?.father_name),
    field('Nome da mãe', m.family?.mother_name),
    `<div class="field col-span-3"><div class="lbl">Filhos (${m.family?.children?.length ?? 0})</div><div class="val">${filhos}</div></div>`,
  ].join('')

  const espiritual = [
    field('Convertido', m.conversion ? 'Sim' : 'Não'),
    field('Data da conversão', fmtDateShort(m.conversion_date)),
    field('Batismo nas águas', m.baptism ? 'Sim' : 'Não'),
    field('Data batismo águas', fmtDateShort(m.baptism_date)),
    field('Batismo no Espírito', m.baptism_spirit ? 'Sim' : 'Não'),
    field('Data batismo Espírito', fmtDateShort(m.baptism_spirit_date)),
  ].join('')

  const ministerio = [
    field('Títulos', m.ministry?.titles?.join(', ')),
    field('Ministérios', m.ministry?.ministries?.join(', ')),
    field('Departamentos', m.ministry?.departments?.join(', ')),
    field('Funções', m.ministry?.functions?.join(', ')),
    field('Companheiro(a)', m.ministry?.companion),
  ].join('')

  const admin = [
    field('Igreja', m.church?.name),
    field('Status', statusTxt),
    field('Data de entrada', fmtDateShort(m.entry_date)),
    field('Motivo de entrada', m.entry_reason),
    field('Igreja de origem', m.origin_church),
    field('Como chegou', m.how_arrived),
    field('Data de saída', fmtDateShort(m.exit_date)),
    field('Motivo de saída', m.exit_reason),
  ].join('')

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>
    <title>Cadastro — ${m.name}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Arial,sans-serif;font-size:11px;color:#111;padding:18px;background:#fff}
      .brand-header{width:100%;display:flex;justify-content:center;margin-bottom:6px}
      .brand-header img{max-width:100%;max-height:100px;object-fit:contain}
      .title-bar{display:flex;align-items:center;justify-content:space-between;border-top:2px solid #1d4ed8;border-bottom:2px solid #1d4ed8;padding:8px 4px;margin-bottom:14px}
      .title-bar h1{font-size:15px;color:#1d4ed8;margin:0}
      .title-bar .meta{font-size:10px;color:#666;text-align:right}
      .title-bar .status{display:inline-block;margin-left:6px;padding:1px 8px;border-radius:10px;font-size:9px;font-weight:bold;background:#dbeafe;color:#1d4ed8;vertical-align:middle}
      .section{margin-bottom:12px;border:1px solid #e5e7eb;border-radius:4px;overflow:hidden}
      .section-title{background:#1d4ed8;color:#fff;font-size:10px;font-weight:bold;letter-spacing:.5px;padding:5px 10px;text-transform:uppercase}
      .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px 14px;padding:10px}
      .field{min-width:0}
      .field.col-span-3{grid-column:span 3}
      .lbl{font-size:8.5px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.3px;margin-bottom:1px}
      .val{font-size:10.5px;color:#111;word-break:break-word}
      .footer{margin-top:14px;font-size:9px;color:#9ca3af;text-align:right;border-top:1px solid #e5e7eb;padding-top:6px}
      @media print{body{padding:10mm}.no-print{display:none!important}@page{size:A4;margin:8mm}}
    </style>
    </head><body>
    <div class="no-print" style="margin-bottom:12px;display:flex;gap:8px;align-items:center;background:#f0f4ff;border:1px solid #c7d7fb;border-radius:6px;padding:8px 12px">
      <span style="font-size:11px;color:#1d4ed8;font-weight:600">📄 Cadastro individual — ${m.name}</span>
      <button onclick="window.print()" style="background:#1d4ed8;color:white;border:none;padding:5px 14px;border-radius:5px;cursor:pointer;font-size:11px;margin-left:auto">🖨️ Imprimir</button>
      <button onclick="window.close()" style="background:#f3f4f6;border:1px solid #d1d5db;padding:5px 14px;border-radius:5px;cursor:pointer;font-size:11px">✕ Fechar</button>
    </div>
    <div class="brand-header"><img src="${window.location.origin}/brand/cabecalho.png" alt="AD Piracanjuba" onerror="this.style.display='none'"/></div>
    <div class="title-bar">
      <h1>${m.name ?? '—'}<span class="status">${statusTxt}</span></h1>
      <div class="meta">${m.church?.name ?? ''}${m.church?.name ? '<br/>' : ''}Gerado em ${dateStr}</div>
    </div>
    ${section('Identificação', ident)}
    ${section('Contatos', contatos)}
    ${section('Família', familia)}
    ${section('Vida Espiritual', espiritual)}
    ${section('Ministério', ministerio)}
    ${section('Administrativo', admin)}
    <div class="footer">Igreja Digital · ${format(new Date(), 'dd/MM/yyyy HH:mm')}</div>
    </body></html>`

  openPrintWindow(html, `Cadastro — ${m.name}`)
}
