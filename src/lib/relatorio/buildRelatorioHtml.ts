// Gerador de HTML para relatórios — cabeçalho/rodapé padronizados
// Usado por todos os módulos: financeiro, secretaria, etc.

export interface RelatorioInfo {
  titulo: string           // ex: "Extrato Financeiro"
  subtitulo?: string       // ex: "Entradas e saídas do período"
  filtros?: string[]       // ex: ["Período: 01/06/2026 a 30/06/2026", "Tipo: Entrada"]
  corpo: string            // HTML do conteúdo principal (tabela, lista, etc.)
}

const LOGO_URL = '/brand/logo.png'
const NOME_IGREJA = 'Assembleia de Deus — Campo de Piracanjuba/GO'
const CNPJ = '37.261.666/0001-03'
const PASTOR = 'Pastor Presidente: Gilson Marcos S. da Silva'
const ENDERECO = 'Av. Noêmia Honorato, nº 161 — Setor Oeste — Piracanjuba/GO'

function fmtDataHoje(): string {
  const d = new Date()
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

function fmtDataHoraAgora(): string {
  const d = new Date()
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function buildRelatorioHtml(info: RelatorioInfo): string {
  const filtrosHtml = info.filtros && info.filtros.length > 0
    ? `<div class="filtros">
        <span class="filtros-label">Filtros aplicados:</span>
        ${info.filtros.map(f => `<span class="filtro-tag">${f}</span>`).join('')}
       </div>`
    : ''

  const subtituloHtml = info.subtitulo
    ? `<div class="subtitulo">${info.subtitulo}</div>`
    : ''

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>${info.titulo} — ${NOME_IGREJA}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { font-family: Arial, sans-serif; font-size: 11px; color: #111; background: #fff; }

    /* ── Cabeçalho ── */
    .cabecalho {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 10mm 12mm 6mm;
      border-bottom: 2px solid #1e3a5f;
    }
    .cabecalho-logo {
      width: 64px;
      height: 64px;
      object-fit: contain;
      flex-shrink: 0;
    }
    .cabecalho-info { flex: 1; }
    .cabecalho-nome {
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: .4px;
      color: #1e3a5f;
      line-height: 1.3;
    }
    .cabecalho-detalhe {
      font-size: 9.5px;
      color: #555;
      margin-top: 3px;
      line-height: 1.6;
    }
    .cabecalho-titulo-bloco {
      text-align: right;
      flex-shrink: 0;
    }
    .titulo-relatorio {
      font-size: 14px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: .6px;
      color: #1e3a5f;
    }
    .subtitulo {
      font-size: 10px;
      color: #666;
      margin-top: 2px;
    }
    .emissao {
      font-size: 9px;
      color: #999;
      margin-top: 4px;
    }

    /* ── Filtros ── */
    .filtros {
      padding: 4px 12mm;
      background: #f0f4f9;
      border-bottom: 1px solid #d0dbe8;
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      align-items: center;
      font-size: 9.5px;
      color: #444;
    }
    .filtros-label { font-weight: 700; margin-right: 2px; color: #1e3a5f; }
    .filtro-tag {
      background: #fff;
      border: 1px solid #c5d3e0;
      border-radius: 3px;
      padding: 1px 6px;
      color: #333;
    }

    /* ── Corpo ── */
    .corpo {
      padding: 6mm 12mm 4mm;
    }

    /* ── Tabelas padrão ── */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    thead tr {
      background: #1e3a5f;
      color: #fff;
    }
    thead th {
      padding: 5px 6px;
      text-align: left;
      font-weight: 700;
      font-size: 9.5px;
      letter-spacing: .3px;
      text-transform: uppercase;
    }
    thead th.right { text-align: right; }
    thead th.center { text-align: center; }
    tbody tr:nth-child(even) { background: #f7f9fc; }
    tbody tr:hover { background: #eef2f8; }
    tbody td {
      padding: 4px 6px;
      border-bottom: 1px solid #e8ecf0;
      vertical-align: middle;
    }
    tbody td.right { text-align: right; }
    tbody td.center { text-align: center; }
    tbody td.entrada { color: #166534; font-weight: 600; }
    tbody td.saida { color: #991b1b; font-weight: 600; }
    tfoot tr { background: #1e3a5f; color: #fff; }
    tfoot td {
      padding: 5px 6px;
      font-weight: 700;
      font-size: 10px;
    }
    tfoot td.right { text-align: right; }

    /* ── Resumo / cards ── */
    .resumo {
      display: flex;
      gap: 8px;
      margin-bottom: 6mm;
    }
    .resumo-card {
      flex: 1;
      border: 1px solid #d0dbe8;
      border-radius: 6px;
      padding: 6px 10px;
      background: #f7f9fc;
    }
    .resumo-card.verde { border-color: #86efac; background: #f0fdf4; }
    .resumo-card.vermelho { border-color: #fca5a5; background: #fff5f5; }
    .resumo-card.azul { border-color: #93c5fd; background: #eff6ff; }
    .resumo-card-label { font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: .3px; }
    .resumo-card-valor { font-size: 14px; font-weight: 800; color: #111; margin-top: 2px; }
    .resumo-card.verde .resumo-card-valor { color: #166534; }
    .resumo-card.vermelho .resumo-card-valor { color: #991b1b; }
    .resumo-card.azul .resumo-card-valor { color: #1e40af; }

    /* ── Rodapé ── */
    .rodape {
      position: running(rodape);
    }
    @page {
      size: A4 portrait;
      margin: 0;
      @bottom-center {
        content: element(rodape);
      }
    }
    .rodape-fixo {
      margin-top: 10mm;
      padding: 4px 12mm;
      border-top: 1.5px solid #1e3a5f;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8.5px;
      color: #666;
    }
    .rodape-nome { font-weight: 700; color: #1e3a5f; }

    @media print {
      html, body { width: 100%; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      @page { size: A4 portrait; margin: 0; }
      .rodape-fixo { display: none; }
    }
  </style>
</head>
<body>

  <!-- CABEÇALHO -->
  <div class="cabecalho">
    <img class="cabecalho-logo" src="${LOGO_URL}" alt="Logo" crossorigin="anonymous"/>
    <div class="cabecalho-info">
      <div class="cabecalho-nome">${NOME_IGREJA}</div>
      <div class="cabecalho-detalhe">
        CNPJ: ${CNPJ}<br/>
        ${PASTOR}<br/>
        ${ENDERECO}
      </div>
    </div>
    <div class="cabecalho-titulo-bloco">
      <div class="titulo-relatorio">${info.titulo}</div>
      ${subtituloHtml}
      <div class="emissao">Emitido em ${fmtDataHoraAgora()}</div>
    </div>
  </div>

  <!-- FILTROS -->
  ${filtrosHtml}

  <!-- CORPO -->
  <div class="corpo">
    ${info.corpo}
  </div>

  <!-- RODAPÉ (visível na tela; na impressão o @page cuida das páginas) -->
  <div class="rodape-fixo">
    <span class="rodape-nome">${NOME_IGREJA}</span>
    <span>Emitido em ${fmtDataHoje()}</span>
    <span class="pagina-info">Página 1</span>
  </div>

</body>
</html>`
}
