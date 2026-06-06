-- ============================================================================
-- 011_fin_forma_pagamento.sql — Forma de pagamento nos lançamentos financeiros
-- ============================================================================

alter table fin_lancamentos
  add column if not exists forma_pagamento text check (forma_pagamento in ('dinheiro','pix','cartao_debito','cartao_credito')) default null,
  add column if not exists parcelas integer default null;

-- ============================================================================
-- FIM 011_fin_forma_pagamento.sql
-- ============================================================================
