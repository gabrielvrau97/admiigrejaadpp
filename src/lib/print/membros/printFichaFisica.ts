import { openPrintWindow } from '../../print'

const line = (w = '100%') =>
  `<div style="border-bottom:1px solid #aaa;width:${w};min-height:14px;display:inline-block;vertical-align:bottom"></div>`

const box = (label: string) =>
  `<span style="display:inline-flex;align-items:center;gap:4px;margin-right:10px;font-size:9px"><span style="width:10px;height:10px;border:1px solid #555;display:inline-block;vertical-align:middle;border-radius:2px"></span>${label}</span>`

function ficha() {
  return `
    <div class="ficha">
      <div style="width:100%;display:flex;justify-content:center;margin-bottom:4px">
        <img src="${window.location.origin}/brand/cabecalho.png" alt="AD Piracanjuba" style="max-width:100%;max-height:60px;object-fit:contain" onerror="this.style.display='none'"/>
      </div>
      <div class="header">
        <div class="header-title">
          <div style="font-size:13px;font-weight:bold;color:#1d4ed8">FICHA DE CADASTRO</div>
          <div style="font-size:9px;color:#555">Secretaria</div>
        </div>
        <div class="header-right">
          <div class="field-row"><span class="lbl">Igreja:</span>${line('120px')}</div>
          <div class="field-row" style="margin-top:4px"><span class="lbl">Data:</span>${line('80px')}&nbsp;&nbsp;<span class="lbl">Cód.:</span>${line('60px')}</div>
        </div>
      </div>

      <div class="section-title">IDENTIFICAÇÃO</div>
      <div class="row">
        <div class="col-8"><span class="lbl">Nome completo:</span>${line()}</div>
        <div class="col-4"><span class="lbl">Apelido:</span>${line()}</div>
      </div>
      <div class="row">
        <div class="col-3"><span class="lbl">Sexo:</span>&nbsp;${box('Masc.')}${box('Fem.')}</div>
        <div class="col-3"><span class="lbl">Nascimento:</span>${line()}</div>
        <div class="col-3"><span class="lbl">Naturalidade:</span>${line()}</div>
        <div class="col-3"><span class="lbl">Nacionalidade:</span>${line()}</div>
      </div>
      <div class="row">
        <div class="col-4"><span class="lbl">Estado civil:</span>&nbsp;${box('Solteiro(a)')}${box('Casado(a)')}${box('Viúvo(a)')}${box('Divorciado(a)')}</div>
        <div class="col-4"><span class="lbl">Escolaridade:</span>${line()}</div>
        <div class="col-4"><span class="lbl">Profissão:</span>${line()}</div>
      </div>
      <div class="row">
        <div class="col-4"><span class="lbl">CPF:</span>${line()}</div>
        <div class="col-4"><span class="lbl">RG / Identidade:</span>${line()}</div>
        <div class="col-4"><span class="lbl">Data de entrada:</span>${line()}</div>
      </div>

      <div class="section-title">CONTATOS</div>
      <div class="row">
        <div class="col-6"><span class="lbl">Celular 1:</span>${line()}</div>
        <div class="col-6"><span class="lbl">Celular 2 / Telefone:</span>${line()}</div>
      </div>
      <div class="row">
        <div class="col-6"><span class="lbl">E-mail 1:</span>${line()}</div>
        <div class="col-6"><span class="lbl">E-mail 2:</span>${line()}</div>
      </div>

      <div class="section-title">ENDEREÇO</div>
      <div class="row">
        <div class="col-6"><span class="lbl">Logradouro / Endereço:</span>${line()}</div>
        <div class="col-2"><span class="lbl">Número:</span>${line()}</div>
        <div class="col-4"><span class="lbl">Complemento:</span>${line()}</div>
      </div>
      <div class="row">
        <div class="col-4"><span class="lbl">Bairro:</span>${line()}</div>
        <div class="col-4"><span class="lbl">Cidade:</span>${line()}</div>
        <div class="col-2"><span class="lbl">Estado:</span>${line()}</div>
        <div class="col-2"><span class="lbl">CEP:</span>${line()}</div>
      </div>

      <div class="section-title">FAMÍLIA</div>
      <div class="row">
        <div class="col-6"><span class="lbl">Nome do cônjuge:</span>${line()}</div>
        <div class="col-3"><span class="lbl">Nascimento cônjuge:</span>${line()}</div>
        <div class="col-3"><span class="lbl">Data do casamento:</span>${line()}</div>
      </div>
      <div class="row">
        <div class="col-6"><span class="lbl">Nome do pai:</span>${line()}</div>
        <div class="col-6"><span class="lbl">Nome da mãe:</span>${line()}</div>
      </div>
      <div style="margin:4px 0 2px"><span class="lbl">Filhos:</span></div>
      <div class="row">
        <div class="col-6" style="display:flex;align-items:center;gap:6px"><span class="lbl" style="white-space:nowrap">1.</span>${line('70%')}<span class="lbl" style="white-space:nowrap">Nasc.:</span>${line('28%')}</div>
        <div class="col-6" style="display:flex;align-items:center;gap:6px"><span class="lbl" style="white-space:nowrap">2.</span>${line('70%')}<span class="lbl" style="white-space:nowrap">Nasc.:</span>${line('28%')}</div>
      </div>
      <div class="row">
        <div class="col-6" style="display:flex;align-items:center;gap:6px"><span class="lbl" style="white-space:nowrap">3.</span>${line('70%')}<span class="lbl" style="white-space:nowrap">Nasc.:</span>${line('28%')}</div>
        <div class="col-6" style="display:flex;align-items:center;gap:6px"><span class="lbl" style="white-space:nowrap">4.</span>${line('70%')}<span class="lbl" style="white-space:nowrap">Nasc.:</span>${line('28%')}</div>
      </div>

      <div class="section-title">VIDA ESPIRITUAL</div>
      <div class="row">
        <div class="col-4"><span class="lbl">Convertido:</span>&nbsp;${box('Sim')}${box('Não')}&nbsp;<span class="lbl">Data:</span>${line('50px')}</div>
        <div class="col-4"><span class="lbl">Batismo nas águas:</span>&nbsp;${box('Sim')}${box('Não')}&nbsp;<span class="lbl">Data:</span>${line('50px')}</div>
        <div class="col-4"><span class="lbl">Batismo no Espírito:</span>&nbsp;${box('Sim')}${box('Não')}&nbsp;<span class="lbl">Data:</span>${line('50px')}</div>
      </div>
      <div class="row">
        <div class="col-6"><span class="lbl">Igreja de origem:</span>${line()}</div>
        <div class="col-6"><span class="lbl">Motivo de entrada:</span>${line()}</div>
      </div>

      <div style="display:flex;gap:16px;margin-top:6px">
        <div style="flex:1"><span class="lbl">Assinatura do membro:</span>${line()}</div>
        <div style="flex:1"><span class="lbl">Assinatura do secretário(a):</span>${line()}</div>
      </div>
    </div>
  `
}

export function printFichaFisica() {
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>
  <title>Ficha de Cadastro</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;font-size:9px;color:#111;background:#fff;padding:8mm}
    .ficha{border:1px solid #bbb;border-radius:4px;padding:6px 8px;margin-bottom:4mm;page-break-inside:avoid}
    .header{display:flex;align-items:center;gap:8px;border-bottom:1.5px solid #1d4ed8;padding-bottom:5px;margin-bottom:5px}
    .header-logo{flex-shrink:0}
    .header-title{flex-shrink:0}
    .header-right{flex:1;display:flex;flex-direction:column;align-items:flex-end}
    .section-title{background:#1d4ed8;color:white;font-size:8px;font-weight:bold;letter-spacing:.5px;padding:2px 6px;margin:5px -8px 4px;text-transform:uppercase}
    .row{display:flex;gap:8px;margin-bottom:4px;align-items:flex-end}
    .col-2{flex:2;min-width:0}.col-3{flex:3;min-width:0}.col-4{flex:4;min-width:0}.col-6{flex:6;min-width:0}.col-8{flex:8;min-width:0}
    .lbl{font-size:8px;color:#374151;font-weight:600;white-space:nowrap;margin-right:2px}
    .field-row{display:flex;align-items:center;gap:4px;font-size:8px}
    @media print{
      body{padding:4mm}
      .no-print{display:none!important}
      .ficha{margin-bottom:3mm}
      @page{size:A4;margin:6mm}
    }
  </style>
  </head><body>
  <div class="no-print" style="margin-bottom:10px;display:flex;align-items:center;gap:8px;background:#f0f4ff;border:1px solid #c7d7fb;border-radius:6px;padding:8px 12px">
    <span style="font-size:11px;color:#1d4ed8;font-weight:600">📋 Ficha de Cadastro Física — 2 por folha A4</span>
    <button onclick="window.print()" style="background:#1d4ed8;color:white;border:none;padding:5px 14px;border-radius:5px;cursor:pointer;font-size:11px;margin-left:auto">🖨️ Imprimir</button>
    <button onclick="window.close()" style="background:#f3f4f6;border:1px solid #d1d5db;padding:5px 14px;border-radius:5px;cursor:pointer;font-size:11px">✕ Fechar</button>
  </div>
  ${ficha()}
  ${ficha()}
  </body></html>`

  openPrintWindow(html, 'Ficha de Cadastro')
}
