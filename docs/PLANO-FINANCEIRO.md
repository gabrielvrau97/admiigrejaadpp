# Plano — Módulo Financeiro
**Site ADM ADP — Igreja Digital**
**Status:** Planejado | Trigger: "vamos começar a fase N do financeiro"

---

## Contexto

Módulo financeiro com duas visões de uso:

| | Tesoureiro (`admin_financeiro` ou `master`) | Administrador (`master`) |
|---|---|---|
| Acesso | `/financeiro/tesouraria` | Todas as rotas |
| Lançamentos | Entrada + Saída | Igual + vê histórico de todos |
| Extrato | Só próprio (dia + histórico) | Consolidado com filtros |
| Dashboard | Não | Sim — analítico + integrado com secretaria |
| Configurações | Não | Categorias, fornecedores |

---

## Banco de Dados — Migration 009

### `fin_categorias`
```sql
id uuid PK
church_group_id uuid FK → church_groups
tipo: 'entrada' | 'saida'
nome text
cor text (hex, ex: '#22c55e')
ativo boolean default true
created_at, updated_at
```

**Pré-populadas ao criar grupo:**
- Entradas: Dízimo, Oferta Geral, Campanha, Outros
- Saídas: Ajuda Social, Combustível, Conta Fixa, Material, Outros

---

### `fin_fornecedores`
```sql
id uuid PK
church_group_id uuid FK → church_groups
nome text NOT NULL
documento text (cpf/cnpj, opcional)
contato text
observacao text
ativo boolean default true
created_at, updated_at
```

---

### `fin_lancamentos`
```sql
id uuid PK
church_group_id uuid FK → church_groups
church_id uuid FK → churches           -- filial do lançamento
tipo: 'entrada' | 'saida'
categoria_id uuid FK → fin_categorias
fornecedor_id uuid FK → fin_fornecedores  -- nullable (saídas)
member_id uuid FK → members               -- nullable (entradas E saídas)
member_nome_manual text                   -- nome livre se não vincular a membro
valor numeric(12,2) NOT NULL
descricao text
referencia_culto text                     -- ex: "Culto Dom 01/06"
data_lancamento date NOT NULL
origem: 'manual' | 'importado'  default 'manual'
periodo_referencia text                   -- ex: "2025-03" (pra histórico importado)
created_by uuid FK → app_users
observacao text
created_at, updated_at
```

**RLS:**
- `admin_financeiro`: INSERT livre no group_id; SELECT/UPDATE/DELETE só nos próprios (`created_by = uid`)
- `master`: tudo no group_id

**Triggers:** auditoria automática via `audit_trigger_func` (igual às outras tabelas)

---

## Rotas

```
/financeiro                     → redirect: master → /financeiro/dashboard
                                             admin_financeiro → /financeiro/tesouraria
/financeiro/tesouraria          → visão tesoureiro (ambos os papéis)
/financeiro/extrato             → extrato consolidado (master only)
/financeiro/dashboard           → dashboards (master only)
/financeiro/configuracoes       → categorias + fornecedores (master only)
```

---

## Fase 1 — Banco + Configurações (~3h)
**Trigger:** "vamos começar a fase 1 do financeiro"

### O que fazer
1. Criar `supabase/migrations/009_financeiro.sql`:
   - Tabelas `fin_categorias`, `fin_fornecedores`, `fin_lancamentos`
   - RLS nas 3 tabelas
   - Triggers de auditoria
   - Função `seed_fin_categorias(group_id)` para pré-popular defaults
2. Criar APIs:
   - `src/lib/api/fin_categorias.ts` — CRUD
   - `src/lib/api/fin_fornecedores.ts` — CRUD
   - `src/lib/api/fin_lancamentos.ts` — CRUD + queries com joins
3. Criar página `/financeiro/configuracoes` (master only):
   - Tab **Entradas**: lista de categorias tipo entrada, criar/editar/desativar + cor
   - Tab **Saídas**: lista de categorias tipo saída, criar/editar/desativar + cor
   - Tab **Fornecedores**: lista com busca, criar/editar/desativar
4. Atualizar `FinanceiroPage.tsx` para redirecionar por papel

---

## Fase 2 — Tesouraria (~4h)
**Trigger:** "vamos começar a fase 2 do financeiro"

### O que fazer
Página `/financeiro/tesouraria`:

**Header:**
- Card **Caixa do Dia**: total entradas do dia − total saídas do dia (só lançamentos do usuário logado)
- Botões de ação rápida: `+ Entrada` / `+ Saída`

**Corpo:**
- Tab **Hoje**: lançamentos do dia (do usuário), tabela compacta
- Tab **Histórico**: todos os lançamentos próprios, filtro por período

**Modal de Entrada:**
- Categoria (dropdown — só entradas)
- Filial (dropdown das igrejas)
- Membro (MemberSearch — autocomplete ou nome manual)
- Valor
- Referência culto (texto livre)
- Data (default hoje)
- Observação

**Modal de Saída:**
- Categoria (dropdown — só saídas)
- Filial (dropdown das igrejas)
- Fornecedor (autocomplete `fin_fornecedores` ou texto livre)
- Membro beneficiado (MemberSearch — opcional, ex: ajuda a família)
- Valor
- Descrição
- Data (default hoje)
- Observação

---

## Fase 3 — Extrato Consolidado (~3h)
**Trigger:** "vamos começar a fase 3 do financeiro"

### O que fazer
Página `/financeiro/extrato` (master only):

**Filtros:**
- Período (data início / fim)
- Filial
- Tipo (entrada / saída / todos)
- Categoria
- Usuário que lançou
- Membro vinculado

**Tabela paginada:**
- Data | Tipo | Categoria | Membro/Fornecedor | Filial | Valor | Lançado por

**Rodapé fixo:**
- Total Entradas | Total Saídas | Saldo

**Exportação:** Excel via `xlsx` (já instalado)

---

## Fase 4 — Dashboard Analítico (~4h)
**Trigger:** "vamos começar a fase 4 do financeiro"

### O que fazer
Página `/financeiro/dashboard` (master only):

**Filtros globais no topo:** período + filial

**Seção 1 — KPIs do Mês:**
- Total Entradas | Total Saídas | Saldo | Variação vs mês anterior (%)

**Seção 2 — Fluxo de Caixa:**
- Gráfico de linha — entradas vs saídas mês a mês (últimos 12 meses)

**Seção 3 — Distribuição:**
- Pizza: distribuição de entradas por categoria
- Pizza: distribuição de saídas por categoria

**Seção 4 — Rankings:**
- Top contribuintes do mês (membros por valor)
- Maiores despesas do mês (top categorias de saída)

**Seção 5 — Visão Integrada Secretaria × Financeiro:**
(aparece só quando há member_id vinculado suficiente)
- Contribuição por faixa etária
- Contribuição por cidade/região
- Contribuição por ministério
- Contribuição por filial
- Taxa de regularidade (% de membros que contribuíram nos últimos 3/6/12 meses)
- Lista: membros ativos sem nenhum lançamento financeiro (ação pastoral)
- Clique no membro → abre MemberQuickView (já implementado)

---

## Observações de implementação

### Importação de histórico (futuro)
Campo `origem = 'importado'` e `periodo_referencia = 'YYYY-MM'` já estão no schema.
Quando o usuário entregar o histórico consolidado, criar script em `scripts/migration/import-financeiro.mjs` seguindo o mesmo padrão do `import-legacy.mjs`.

### Reaproveitamento do que já existe
- `MemberSearch` — autocomplete de membros (entrada/saída vinculada)
- `MemberQuickViewProvider` — abrir ficha do membro a partir do dashboard
- `recharts` — já instalado, usado em GraficosPage
- `xlsx` — já instalado, usado em exportações existentes
- `useToast`, `useConfirm` — padrão do projeto
- Temas de cor por área — padrão `members-themes.ts`
- `ChurchContext` — dropdown de filiais

### Não implementar agora
- RLS separada por filial para tesoureiro (cada tesoureiro vê só sua igreja) — deixar pra quando houver necessidade real
- Notificações financeiras no topo (ex: meta atingida) — fase futura
- Metas financeiras por período — fase futura

---

## Histórico de execuções

| Data | Fase | Status |
|---|---|---|
| — | — | — |
