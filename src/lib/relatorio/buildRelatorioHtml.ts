export interface RelatorioInfo {
  titulo: string
  subtitulo?: string
  filtros?: string[]
  corpo: string
}

const LOGO_URL      = '/brand/logo.png'
const NOME_CURTO    = 'ASSEMBLEIA DE DEUS'
const NOME_CAMPO    = 'CAMPO DE PIRACANJUBA — GO'
const CNPJ          = '37.261.666/0001-03'
const PASTOR        = 'Pastor Presidente: Gilson Marcos S. da Silva'
const ENDERECO      = 'Av. Noêmia Honorato, nº 161 — Setor Oeste — Piracanjuba/GO'

function fmtDataHoje(): string {
  return new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}
function fmtDataHoraAgora(): string {
  return new Date().toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function buildRelatorioHtml(info: RelatorioInfo): string {
  const filtrosHtml = info.filtros && info.filtros.length > 0
    ? `<div class="filtros-bar">
        <span class="filtros-label">Filtros:</span>
        ${info.filtros.map(f => `<span class="filtro-pill">${f}</span>`).join('')}
       </div>`
    : ''

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>${info.titulo} — ${NOME_CURTO} ${NOME_CAMPO}</title>
  <style>
    /* ── Reset & Base ─────────────────────────────────── */
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    html { font-size: 10px; }
    body {
      font-family: 'Arial', 'Helvetica Neue', Helvetica, sans-serif;
      font-size: 1rem;
      color: #1a1a2e;
      background: #fff;
      line-height: 1.4;
    }

    /* ── Wrapper da página ────────────────────────────── */
    .page-wrap {
      width: 100%;
      min-height: 100vh;
      border: 3px solid #1e3a5f;
      display: flex;
      flex-direction: column;
    }

    /* ── Cabeçalho ────────────────────────────────────── */
    .cabecalho {
      display: grid;
      grid-template-columns: 72px 1fr auto;
      align-items: center;
      gap: 0;
      padding: 0;
      border-bottom: 3px solid #1e3a5f;
      background: #fff;
    }

    /* coluna logo */
    .cab-logo-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 10px 10px;
      border-right: 2px solid #c9d8e8;
      height: 100%;
    }
    .cab-logo {
      width: 52px;
      height: 52px;
      object-fit: contain;
    }

    /* coluna info da instituição */
    .cab-instituicao {
      padding: 10px 14px;
      border-right: 2px solid #c9d8e8;
    }
    .cab-nome-principal {
      font-size: 1.35rem;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #1e3a5f;
      line-height: 1.15;
    }
    .cab-nome-campo {
      font-size: 0.9rem;
      font-weight: 700;
      color: #2d5f8a;
      letter-spacing: 0.4px;
      margin-top: 1px;
    }
    .cab-separator {
      width: 28px;
      height: 2px;
      background: #c9d8e8;
      margin: 5px 0;
    }
    .cab-detalhes {
      font-size: 0.82rem;
      color: #4a5568;
      line-height: 1.65;
    }
    .cab-detalhes strong {
      color: #2d3748;
      font-weight: 700;
    }

    /* coluna título do relatório */
    .cab-titulo-bloco {
      padding: 10px 14px;
      text-align: right;
      min-width: 160px;
    }
    .cab-titulo-label {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #7a9cbf;
    }
    .cab-titulo-valor {
      font-size: 1.4rem;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #1e3a5f;
      line-height: 1.1;
      margin-top: 2px;
    }
    .cab-subtitulo {
      font-size: 0.82rem;
      color: #4a7ba7;
      font-style: italic;
      margin-top: 3px;
    }
    .cab-emissao {
      font-size: 0.75rem;
      color: #9aacbe;
      margin-top: 6px;
      padding-top: 5px;
      border-top: 1px solid #e2eaf2;
    }
    .cab-emissao strong { color: #5a7fa0; }

    /* ── Faixa de filtros ─────────────────────────────── */
    .filtros-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 5px;
      padding: 5px 14px;
      background: #f0f5fb;
      border-bottom: 1.5px solid #c9d8e8;
      font-size: 0.82rem;
    }
    .filtros-label {
      font-weight: 800;
      color: #1e3a5f;
      margin-right: 2px;
      text-transform: uppercase;
      font-size: 0.75rem;
      letter-spacing: 0.5px;
    }
    .filtro-pill {
      background: #fff;
      border: 1px solid #b0c8df;
      border-radius: 20px;
      padding: 1px 8px;
      color: #2d5f8a;
      font-weight: 600;
      font-size: 0.8rem;
    }

    /* ── Corpo ────────────────────────────────────────── */
    .corpo {
      flex: 1;
      padding: 10px 14px 12px;
    }

    /* ── Tabelas ──────────────────────────────────────── */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
      border: 1.5px solid #7a9cbf;
    }
    thead tr {
      background: #1e3a5f;
      color: #fff;
    }
    thead th {
      padding: 5px 7px;
      text-align: left;
      font-weight: 700;
      font-size: 0.82rem;
      letter-spacing: 0.4px;
      text-transform: uppercase;
      border-right: 1px solid #2d5f8a;
      white-space: nowrap;
    }
    thead th:last-child { border-right: none; }
    thead th.right { text-align: right; }
    thead th.center { text-align: center; }

    tbody td {
      padding: 4px 7px;
      border-bottom: 1px solid #dce8f2;
      border-right: 1px solid #dce8f2;
      vertical-align: middle;
      font-size: 0.88rem;
    }
    tbody td:last-child { border-right: none; }
    tbody tr:nth-child(even) { background: #f7fafd; }
    tbody td.right  { text-align: right; }
    tbody td.center { text-align: center; }
    tbody td.entrada { color: #145a2e; font-weight: 700; }
    tbody td.saida   { color: #7f1d1d; font-weight: 700; }

    tfoot tr {
      background: #1e3a5f;
      color: #fff;
    }
    tfoot td {
      padding: 5px 7px;
      font-weight: 800;
      font-size: 0.9rem;
      border-right: 1px solid #2d5f8a;
    }
    tfoot td:last-child { border-right: none; }
    tfoot td.right { text-align: right; }

    /* ── Rodapé ───────────────────────────────────────── */
    .rodape {
      border-top: 2px solid #1e3a5f;
      background: #f0f5fb;
      padding: 5px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .rodape-nome {
      font-size: 0.82rem;
      font-weight: 800;
      color: #1e3a5f;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .rodape-data {
      font-size: 0.8rem;
      color: #4a7ba7;
    }
    .rodape-pagina {
      font-size: 0.8rem;
      font-weight: 700;
      color: #1e3a5f;
      background: #fff;
      border: 1px solid #b0c8df;
      border-radius: 3px;
      padding: 1px 7px;
    }

    /* ── Print ────────────────────────────────────────── */
    @media print {
      html, body { width: 100%; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      @page { size: A4 landscape; margin: 8mm; }
      .page-wrap { border: 2px solid #1e3a5f; }
    }
  </style>
</head>
<body>
<div class="page-wrap">

  <!-- CABEÇALHO -->
  <div class="cabecalho">
    <div class="cab-logo-wrap">
      <img class="cab-logo" src="${LOGO_URL}" alt="Logo AD" crossorigin="anonymous"/>
    </div>
    <div class="cab-instituicao">
      <div class="cab-nome-principal">${NOME_CURTO}</div>
      <div class="cab-nome-campo">${NOME_CAMPO}</div>
      <div class="cab-separator"></div>
      <div class="cab-detalhes">
        <strong>CNPJ:</strong> ${CNPJ} &nbsp;|&nbsp; ${PASTOR}<br/>
        ${ENDERECO}
      </div>
    </div>
    <div class="cab-titulo-bloco">
      <div class="cab-titulo-label">Relatório</div>
      <div class="cab-titulo-valor">${info.titulo}</div>
      ${info.subtitulo ? `<div class="cab-subtitulo">${info.subtitulo}</div>` : ''}
      <div class="cab-emissao">Emitido em <strong>${fmtDataHoraAgora()}</strong></div>
    </div>
  </div>

  <!-- FILTROS -->
  ${filtrosHtml}

  <!-- CORPO -->
  <div class="corpo">
    ${info.corpo}
  </div>

  <!-- RODAPÉ -->
  <div class="rodape">
    <span class="rodape-nome">${NOME_CURTO} — ${NOME_CAMPO}</span>
    <span class="rodape-data">Emitido em ${fmtDataHoje()}</span>
    <span class="rodape-pagina">Pág. 1</span>
  </div>

</div>
</body>
</html>`
}
