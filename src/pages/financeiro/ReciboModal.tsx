import React from 'react'
import { X, Printer, MessageCircle, CheckCircle, Download } from 'lucide-react'
import type { FinReciboComLancamento } from '../../lib/api/fin_recibos'
import { useAuth } from '../../contexts/AuthContext'
import { ROLE_LABELS } from '../../lib/permissions'

interface Props {
  recibo: FinReciboComLancamento
  onClose: () => void
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(s: string) {
  const [y, m, d] = s.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

function fmtDateExtenso(s: string) {
  const [y, m, d] = s.slice(0, 10).split('-')
  return `${parseInt(d)} de ${MESES[parseInt(m) - 1]} de ${y}`
}

function formaPagLabel(f?: string, parcelas?: number) {
  if (!f) return ''
  if (f === 'dinheiro') return 'Dinheiro'
  if (f === 'pix') return 'Pix'
  if (f === 'cartao_debito') return 'Cartão de Débito'
  if (f === 'cartao_credito') return `Cartão de Crédito${parcelas && parcelas > 1 ? ` (${parcelas}x)` : ''}`
  return f
}

function fmtCpf(cpf?: string) {
  if (!cpf) return ''
  const d = cpf.replace(/\D/g, '')
  if (d.length === 11) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`
  return cpf
}

function getMemberPhone(recibo: FinReciboComLancamento): string {
  const raw = recibo.lancamento.member?.contacts
  if (!raw) return ''
  const contacts = Array.isArray(raw) ? raw[0] : raw
  if (!contacts) return ''
  if (contacts.cellphone1) return contacts.cellphone1
  if (contacts.phones && contacts.phones.length > 0) return contacts.phones[0]
  return ''
}

function slugify(nome: string) {
  return nome
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 40)
}

function buildReciboHtml(
  recibo: FinReciboComLancamento,
  emitidoPorNome: string,
  emitidoPorEmail: string,
  emitidoPorRole: string,
  tesoreiroNome: string,
): string {
  const l = recibo.lancamento
  const isEntrada = l.tipo === 'entrada'
  const nomeContribuinte = l.member?.name ?? l.member_nome_manual ?? '—'
  const cpfContribuinte = fmtCpf(l.member?.cpf)
  const forma = formaPagLabel(l.forma_pagamento, l.parcelas)
  const agora = new Date()
  const dataImpressao = `${String(agora.getDate()).padStart(2,'0')}/${String(agora.getMonth()+1).padStart(2,'0')}/${agora.getFullYear()} às ${String(agora.getHours()).padStart(2,'0')}:${String(agora.getMinutes()).padStart(2,'0')}`

  const descPartes: string[] = []
  if (l.categoria?.nome) descPartes.push(l.categoria.nome)
  if (l.referencia_culto) descPartes.push(l.referencia_culto)
  if (l.descricao) descPartes.push(l.descricao)
  const motivoTexto = descPartes.join(' — ') || (isEntrada ? 'contribuição voluntária' : 'pagamento')

  const churchAddress = l.church?.address ?? ''
  const cidadeMatch = churchAddress.match(/([A-Za-zÀ-ÿ\s]+)\/([A-Z]{2})/i)
  const localidade = cidadeMatch ? `${cidadeMatch[1].trim()}, ${cidadeMatch[2].toUpperCase()}` : ''

  // Nome para exibir na assinatura do tesoureiro: prioriza tesoureiro selecionado, fallback para usuário logado
  const nomeTesoureiro = tesoreiroNome || l.tesoureiro?.nome || l.created_by_user?.name || emitidoPorNome

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Recibo ${recibo.numero}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #111; background: #fff; }
    .page {
      width: 100%;
      min-height: 148mm;
      padding: 12mm 14mm 10mm;
    }
    .org-name { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; }
    .org-info { font-size: 10px; color: #444; margin-top: 2px; line-height: 1.5; }
    .titulo {
      text-align: center;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin: 10px 0 8px;
      padding: 5px 0;
      border-top: 1.5px solid #111;
      border-bottom: 1.5px solid #111;
    }
    .corpo {
      font-size: 12px;
      line-height: 1.8;
      margin-bottom: 12px;
      text-align: justify;
    }
    .destaque { font-weight: 700; }
    .localidade {
      font-size: 11px;
      margin-bottom: 18px;
      color: #333;
    }
    .assinaturas {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      margin-top: 8px;
    }
    .ass-bloco {
      flex: 1;
      text-align: center;
    }
    .ass-linha {
      border-top: 1px solid #555;
      margin-bottom: 4px;
    }
    .ass-nome { font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .ass-cargo { font-size: 10px; color: #555; }
    .rodape {
      margin-top: 14px;
      padding-top: 6px;
      border-top: 1px dashed #aaa;
      font-size: 9px;
      color: #888;
      line-height: 1.4;
    }
    .numero-badge {
      float: right;
      font-size: 10px;
      font-weight: 700;
      color: #444;
      border: 1px solid #ccc;
      padding: 2px 7px;
      border-radius: 4px;
    }
    @media print {
      html, body { width: 100%; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      @page { size: A5 portrait; margin: 0; }
    }
  </style>
</head>
<body>
<div class="page">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;">
    <div>
      <div class="org-name">${l.church?.name ?? 'Igreja'}</div>
      ${l.church?.address ? `<div class="org-info">${l.church.address}</div>` : ''}
      ${l.church?.phone ? `<div class="org-info">Tel: ${l.church.phone}</div>` : ''}
    </div>
    <span class="numero-badge">${recibo.numero}</span>
  </div>

  <div class="titulo">RECIBO DE ${isEntrada ? 'CONTRIBUIÇÃO' : 'PAGAMENTO'}</div>

  <div class="corpo">
    ${isEntrada ? 'Recebemos de' : 'Pagamos a'} <span class="destaque">${nomeContribuinte}</span>${cpfContribuinte ? `, CPF nº <span class="destaque">${cpfContribuinte}</span>,` : ','} o valor de <span class="destaque">${fmt(l.valor)}</span>, referente a${isEntrada ? ' contribuição voluntária' : ''}${motivoTexto ? `: <span class="destaque">${motivoTexto}</span>` : ''}, realizada em <span class="destaque">${fmtDate(l.data_lancamento)}</span>.${forma ? ` Forma de pagamento: ${forma}.` : ''}${l.observacao ? ` ${l.observacao}.` : ''}
  </div>

  ${localidade ? `<div class="localidade">${localidade}, ${fmtDateExtenso(l.data_lancamento)}.</div>` : `<div class="localidade">${fmtDateExtenso(l.data_lancamento)}.</div>`}

  <div class="assinaturas">
    <div class="ass-bloco">
      <div class="ass-linha"></div>
      <div class="ass-nome">${nomeTesoureiro}</div>
      <div class="ass-cargo">Tesoureiro(a)</div>
    </div>
    <div class="ass-bloco">
      <div class="ass-linha"></div>
      <div class="ass-nome">${nomeContribuinte}</div>
      <div class="ass-cargo">&nbsp;</div>
    </div>
  </div>

  <div class="rodape">
    Impresso em ${dataImpressao} por ${emitidoPorEmail} (${emitidoPorRole})${nomeTesoureiro && nomeTesoureiro !== emitidoPorNome ? ` · Tesoureiro: ${nomeTesoureiro}` : ''}${l.registered_at ? ` · Registrado em: ${new Date(l.registered_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ''}
  </div>
</div>
</body>
</html>`
}

export default function ReciboModal({ recibo, onClose }: Props) {
  const { user } = useAuth()
  const l = recibo.lancamento
  const isEntrada = l.tipo === 'entrada'
  const nomeContribuinte = l.member?.name ?? l.member_nome_manual ?? ''

  const memberPhone = getMemberPhone(recibo)
  const whatsPhone = memberPhone || l.church?.phone || ''
  const hasPhone = !!whatsPhone.replace(/\D/g, '')

  const emitidoPorNome = user?.name ?? ''
  const emitidoPorEmail = user?.email ?? ''
  const emitidoPorRole = user?.role ? (ROLE_LABELS[user.role] ?? user.role) : ''
  // Tesoureiro: vem do join do lançamento (tesoureiro_id)
  const tesoreiroNome = l.tesoureiro?.nome ?? ''

  function getHtml() {
    return buildReciboHtml(recibo, emitidoPorNome, emitidoPorEmail, emitidoPorRole, tesoreiroNome)
  }

  function abrirPreview(autoPrint = false) {
    const html = getHtml()
    const nomeSlug = slugify(nomeContribuinte || 'contribuinte')
    const filename = `Recibo_${nomeSlug}_${recibo.numero}`

    const htmlEscaped = JSON.stringify(html)
    const autoStr = autoPrint ? 'true' : 'false'

    const preview = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>${filename}</title>
  <style>
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    html, body { height: 100%; overflow: hidden; }
    body { font-family: Arial, sans-serif; background: #fff; }
    #toolbar {
      position: fixed; inset: 0 0 auto 0; z-index: 200;
      height: 44px; background: #0f2133;
      display: flex; align-items: center; gap: 8px; padding: 0 14px;
      box-shadow: 0 1px 6px rgba(0,0,0,.4);
    }
    .tb-title { flex:1; font-size:12px; font-weight:600; color:#7a9ab8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .tb-sep { width:1px; height:20px; background:#1e3a5f; flex-shrink:0; margin:0 2px; }
    .tb-btn {
      display:flex; align-items:center; gap:5px; padding:5px 13px;
      border:none; border-radius:5px; font-size:12px; font-weight:700;
      cursor:pointer; flex-shrink:0; transition:filter .12s, transform .08s;
    }
    .tb-btn:hover { filter:brightness(1.1); }
    .tb-btn:active { transform:scale(.97); }
    .tb-btn-print { background:#e8f0fb; color:#1c3d5c; }
    .tb-btn-close { background:transparent; color:#64748b; border:1px solid #243a52; }
    #sheet-frame {
      position:fixed; top:44px; left:0; right:0; bottom:0;
      width:100%; height:calc(100vh - 44px); border:none; background:#fff;
    }
    @media print {
      #toolbar { display:none !important; }
      #sheet-frame { top:0; height:100vh; }
    }
  </style>
</head>
<body>
  <div id="toolbar">
    <span style="font-size:15px">🧾</span>
    <span class="tb-title">${filename}</span>
    <div class="tb-sep"></div>
    <button class="tb-btn tb-btn-print" onclick="doPrint()">🖨️ Imprimir / Salvar PDF</button>
    <button class="tb-btn tb-btn-close" onclick="window.close()">✕ Fechar</button>
  </div>
  <iframe id="sheet-frame" scrolling="yes"></iframe>
  <script>
    var html = ${htmlEscaped};
    var frame = document.getElementById('sheet-frame');
    var fdoc = frame.contentDocument || frame.contentWindow.document;
    fdoc.open(); fdoc.write(html); fdoc.close();

    function doPrint() {
      frame.contentWindow.focus();
      frame.contentWindow.print();
    }

    if (${autoStr}) {
      setTimeout(doPrint, 600);
    }
  </script>
</body>
</html>`

    const win = window.open('', '_blank')
    if (!win) return
    win.document.open()
    win.document.write(preview)
    win.document.close()
    win.focus()
  }

  function handleDownload() { abrirPreview(false) }
  function handleImprimir() { abrirPreview(true) }

  function handleWhatsApp() {
    const raw = whatsPhone.replace(/\D/g, '')
    const phone = raw.startsWith('55') ? raw : '55' + raw

    const forma = formaPagLabel(l.forma_pagamento, l.parcelas)
    const cpf = fmtCpf(l.member?.cpf)
    const lines = [
      `*Recibo ${recibo.numero}*`,
      `${l.church?.name ?? ''}`,
      ``,
      `${isEntrada ? 'Contribuição' : 'Pagamento'}: *${fmt(l.valor)}*`,
      nomeContribuinte ? `Contribuinte: ${nomeContribuinte}` : '',
      cpf ? `CPF: ${cpf}` : '',
      l.categoria ? `Categoria: ${l.categoria.nome}` : '',
      forma ? `Forma: ${forma}` : '',
      `Data: ${fmtDate(l.data_lancamento)}`,
      l.descricao ? `Descrição: ${l.descricao}` : '',
      l.referencia_culto ? `Ref.: ${l.referencia_culto}` : '',
      tesoreiroNome ? `Tesoureiro: ${tesoreiroNome}` : '',
    ].filter(Boolean).join('\n')

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(lines)}`
    window.open(url, '_blank')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <CheckCircle size={18} className="text-emerald-500" />
            <span className="text-sm font-bold text-gray-800">Lançamento registrado!</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={16} />
          </button>
        </div>

        {/* Preview resumido */}
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">Recibo</span>
            <span className="text-xs font-bold text-gray-700">{recibo.numero}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700 truncate">
              {l.categoria?.nome ?? (isEntrada ? 'Entrada' : 'Saída')}
              {(l.member?.name || l.member_nome_manual) && (
                <span className="text-gray-400"> · {l.member?.name ?? l.member_nome_manual}</span>
              )}
            </span>
            <span className={`text-base font-black ml-3 flex-shrink-0 ${isEntrada ? 'text-emerald-600' : 'text-red-500'}`}>
              {isEntrada ? '+' : '-'}{fmt(l.valor)}
            </span>
          </div>
          {l.forma_pagamento && (
            <div className="mt-1 text-xs text-gray-400">
              {formaPagLabel(l.forma_pagamento, l.parcelas)}
            </div>
          )}
          {tesoreiroNome && (
            <div className="mt-1 text-xs text-gray-500">
              Tesoureiro: <span className="font-medium">{tesoreiroNome}</span>
            </div>
          )}
          {(l.member?.name || l.member_nome_manual || l.fornecedor) && (
            <div className="mt-1 text-xs text-gray-500 flex gap-3 flex-wrap">
              {(l.member?.name || l.member_nome_manual) && (
                <span>{isEntrada ? 'Contribuinte' : 'Beneficiado'}: <span className="font-medium">{l.member?.name ?? l.member_nome_manual}</span></span>
              )}
              {l.fornecedor && (
                <span>Fornecedor: <span className="font-medium">{l.fornecedor.nome}</span></span>
              )}
            </div>
          )}
          {l.registered_at && (
            <div className="mt-1 text-xs text-gray-400">
              Registrado em: {new Date(l.registered_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="px-5 py-4 space-y-2">
          <p className="text-xs text-gray-500 mb-3 text-center">O que deseja fazer com o recibo?</p>

          {/* Download — destaque principal */}
          <button
            onClick={handleDownload}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-emerald-400 bg-emerald-50 hover:bg-emerald-100 transition-all text-sm font-medium text-emerald-800"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0">
              <Download size={15} className="text-white" />
            </div>
            <div className="text-left">
              <div className="font-bold text-emerald-900">Baixar recibo em PDF</div>
              <div className="text-xs text-emerald-600">
                Abre preview — salve como PDF pelo navegador
              </div>
            </div>
          </button>

          <button
            onClick={handleWhatsApp}
            disabled={!hasPhone}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-all text-sm font-medium text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
              <MessageCircle size={15} className="text-green-600" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-gray-800">Enviar pelo WhatsApp</div>
              <div className="text-xs text-gray-400">
                {hasPhone
                  ? `Encaminhar para ${memberPhone ? `${nomeContribuinte} (${whatsPhone})` : whatsPhone}`
                  : 'Telefone do contribuinte não cadastrado'}
              </div>
            </div>
          </button>

          <button
            onClick={handleImprimir}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-sm font-medium text-gray-700"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Printer size={15} className="text-blue-600" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-gray-800">Imprimir / Salvar PDF</div>
              <div className="text-xs text-gray-400">Abre o recibo formatado (A5)</div>
            </div>
          </button>

          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
