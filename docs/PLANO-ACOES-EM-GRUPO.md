# Plano de ações em grupo (bulk actions)

> **Status:** Aguardando ativação
> **Gatilho:** quando o usuário disser **"vamos começar as ações em grupo"**
> **Criado em:** 2026-04-25

---

## 🎯 Objetivo

Adicionar capacidade de selecionar múltiplos registros e executar ações em massa em todas as categorias do sistema. Reduz cliques repetitivos e cobre cenários como:

- "Promover 8 auxiliares a diáconos de uma vez"
- "Marcar a turma toda como concluída e gerar todos os certificados"
- "Inativar todos os membros que saíram em 2024"
- "Transferir 30 membros da Sede pra nova filial Bela Vista"

---

## 📋 Escopo — entidades cobertas

Aplicar o conceito em **TODAS as listas do sistema**:

1. **Membros** (`/secretaria/membros` e variações)
2. **Visitantes** (`/secretaria/visitantes`)
3. **Congregados / Crianças / Adolescentes / Jovens / Novos convertidos** (todas as variações da MembrosPage)
4. **Matrículas** (dentro de `/seminarios/:id`)
5. **Seminários** (`/seminarios`)
6. **Carteirinhas** (`/carteirinhas`)
7. **Certificados** (`/certificados`)
8. **Igrejas** (`/controle/igrejas`) — quando migrar pro Supabase
9. **Usuários** (`/controle/usuarios`) — quando migrar pro Supabase

---

## 🎨 UX padrão (mesmo em todas as telas)

### 1. Seleção
Já existe checkbox em cada linha hoje. Adicionar:
- **Checkbox no header** com 3 estados:
  - `[ ]` nada selecionado
  - `[✓]` todos visíveis selecionados
  - `[—]` parcial (alguns)
- Botão **"Selecionar todos os filtrados"** (pra incluir páginas seguintes da paginação)
- Contador: **"47 selecionados"**

### 2. Barra de ações em grupo
Aparece **flutuante no rodapé** ou **fixa no topo** quando há ≥1 selecionado:

```
┌────────────────────────────────────────────────────┐
│ 47 membros selecionados                            │
│ [Status ▼] [Títulos ▼] [Ministérios ▼] [Mais ▼]   │
│                                          [Limpar]  │
└────────────────────────────────────────────────────┘
```

### 3. Confirmação obrigatória
Para qualquer ação que afete >5 registros:
```
┌────────────────────────────────────────────┐
│  ⚠️ Confirmar alteração em massa            │
│                                              │
│  Você está prestes a alterar 47 membros.   │
│  Ação: trocar título "Auxiliar" por        │
│  "Diácono" em todos.                        │
│                                              │
│  Essa ação será registrada na auditoria    │
│  e pode ser revertida individualmente.      │
│                                              │
│        [Cancelar]   [Confirmar (47)]       │
└────────────────────────────────────────────┘
```

### 4. Feedback de progresso
Pra ações que demoram (>2s):
- Toast com barra de progresso: **"Atualizando 47 membros... 23/47"**
- No final: **"✅ 47 membros atualizados"** ou **"⚠️ 45 atualizados, 2 com erro (clique pra ver)"**

### 5. Auditoria
Cada item alterado gera 1 entrada no `activity_log` (já coberto pela trigger genérica).

---

## 📂 Catálogo de ações por entidade

### 1. Membros / Visitantes / Congregados / etc.

#### a) Status
- Alterar status → ativo / inativo / indisponível / excluído (soft delete)

#### b) Títulos (campo array em `member_ministry.titles`)
- **Adicionar título** — soma ao que já tem
- **Remover título** — tira o escolhido se existir
- **Trocar título** — remove A e adiciona B (ex: "Auxiliar" → "Diácono")
- **Substituir todos** — apaga lista atual e seta a nova

#### c) Ministérios (`member_ministry.ministries`)
- Mesmas 4 sub-ações de título (adicionar/remover/trocar/substituir)

#### d) Departamentos (`member_ministry.departments`)
- Mesmas 4 sub-ações

#### e) Funções (`member_ministry.functions`)
- Mesmas 4 sub-ações

#### f) Igreja
- **Transferir** todos pra outra igreja (muda `church_id`)

#### g) Vida espiritual
- Marcar/desmarcar **batismo nas águas** (com data opcional)
- Marcar/desmarcar **batismo no Espírito** (com data opcional)
- Marcar/desmarcar **convertido** (com data opcional)

#### h) Tipo de membro
- Mudar `member_type`: membro / visitante / seminarista
- Útil pra "promover visitante a membro"

#### i) Excluir (soft delete)
- Marca status = 'deleted' em todos selecionados

#### j) Imprimir / Exportar
- Imprimir lista dos selecionados (já existe parcialmente)
- Exportar XLSX/CSV dos selecionados (já existe)
- Gerar carteirinhas em lote (já existe)
- Gerar certificados em lote (apenas pra seminaristas concluídos)

---

### 2. Matrículas

#### a) Situação
- Alterar situação → cursando / concluído / desistente / reprovado / trancado

#### b) Notas e frequência em massa
- Lançar **mesma nota** pra todos selecionados (ex: "todos receberam 9.0")
- Lançar **mesma frequência** (ex: "todos com 100%")
- Útil pra cursos que têm aprovação automática

#### c) Datas
- Lançar **data de conclusão** em massa
- Útil pra fechar turma toda na mesma data

#### d) Gerar certificados em lote
- Pra todos concluídos selecionados que ainda não têm certificado
- Já existe parcialmente — vamos integrar com a UX nova

#### e) Excluir matrículas

---

### 3. Seminários

#### a) Status
- planejado / em_andamento / concluído / cancelado

#### b) Excluir

#### c) Duplicar
- Cria cópia do seminário com mesmas configs (útil pra cursos recorrentes)

---

### 4. Carteirinhas

#### a) Status
- ativa → vencida / cancelada / substituída

#### b) Renovar em lote
- Pra carteirinhas vencidas selecionadas → emite renovação automática
- Já existe geração em lote — vamos unificar

#### c) Imprimir em lote
- Já existe

#### d) Excluir / Cancelar

---

### 5. Certificados

#### a) Status
- emitido / cancelado / reemitido

#### b) Imprimir em lote
- Já existe

#### c) Reemitir em lote
- Pra certificados cancelados selecionados → cria nova versão

#### d) Excluir

---

### 6. Igrejas (futuro, quando migrar pro Supabase)

#### a) Tipo
- sede / filial

#### b) Excluir

---

### 7. Usuários (futuro)

#### a) Status
- ativo / inativo

#### b) Papel
- master / admin / secretaria / visualizador

#### c) Reset de senha
- Manda email de recuperação pros selecionados

#### d) Excluir

---

## 🏗️ Arquitetura técnica

### Componentes reutilizáveis a criar

#### `src/components/bulk/BulkSelection.tsx`
Hook + componente que gerencia o `Set<string>` de IDs selecionados, com:
- `selected`, `toggle(id)`, `toggleAll(ids)`, `clear()`
- `selectAll()` / `selectFiltered(allIds)`
- 3 estados do checkbox header

#### `src/components/bulk/BulkActionBar.tsx`
Barra flutuante com botões/dropdowns que aparece quando `selected.size > 0`. Recebe:
- `count` (total selecionado)
- `actions: BulkAction[]` (lista de ações disponíveis)
- `onClear()`

#### `src/components/bulk/BulkConfirmDialog.tsx`
Modal genérico de confirmação de ação em massa. Recebe:
- `title`, `description`, `count`, `actionLabel`, `danger?: boolean`
- `onConfirm()`

#### `src/components/bulk/BulkProgressToast.tsx`
Toast com progresso de operação demorada. Vai como variante do `useToast` existente.

#### `src/lib/bulk/runBulkAction.ts`
Helper que executa N operações em sequência ou em paralelo (chunks de 10), reporta progresso e captura erros individuais sem abortar o lote inteiro:

```ts
const result = await runBulkAction(ids, async (id) => {
  await saveMember({ id, status: 'inativo' })
}, { onProgress: (done, total) => ... })

// result = { ok: 45, errors: [{id, error}] }
```

### Modais de configuração específicos

Pra ações que precisam de input do usuário, criar modais dedicados:

- `BulkChangeStatusModal.tsx` — picker de status
- `BulkChangeTitlesModal.tsx` — escolher operação (add/remove/trocar/substituir) + valor(es)
- `BulkChangeMinistriesModal.tsx` — idem
- `BulkChangeDepartmentsModal.tsx` — idem
- `BulkChangeFunctionsModal.tsx` — idem
- `BulkTransferChurchModal.tsx` — picker de igreja destino
- `BulkSetSpiritualModal.tsx` — checkboxes de batismo/conversão + datas opcionais
- `BulkSetMemberTypeModal.tsx` — picker de tipo
- `BulkSetSituacaoModal.tsx` — pra matrículas
- `BulkSetGradesModal.tsx` — nota + frequência

### Otimizações de performance

Pra alterações em arrays JSONB (titles, ministries, etc) o ideal é **uma única chamada SQL via RPC** em vez de N updates individuais. Plano:

1. **Fase 1 (MVP):** loop client-side com `await saveMember(...)` — simples, lento pra >100 itens
2. **Fase 2 (otimização):** criar funções RPC no Supabase tipo `bulk_add_title(member_ids, title)` que fazem UPDATE em SQL

Começamos com Fase 1 e migramos depois se necessário.

---

## 🔒 Permissões (RLS)

As políticas RLS atuais já bloqueiam o que o usuário não pode mexer. Bulk actions vão respeitar automaticamente:
- Secretaria só consegue alterar membros das igrejas que tem acesso
- Visualizador não consegue executar nenhuma ação em massa (só ver)
- Admin/master consegue tudo no escopo deles

---

## 📊 Logging e rollback

### Cada ação vira N entradas no `activity_log`
Já coberto pela trigger genérica. Permite auditoria detalhada.

### Rollback manual
Como cada item gera log individual, é possível desfazer um por um. **Rollback automático em massa** fica pro futuro (precisa de "transaction id" agrupando o lote).

---

## 🚀 Fases de implementação sugeridas

### Fase A — Infraestrutura (4-6h)
- Criar componentes reutilizáveis (`BulkSelection`, `BulkActionBar`, `BulkConfirmDialog`)
- Helper `runBulkAction`
- Toast de progresso
- Aplicar em **MembrosPage** como referência (status + excluir)

### Fase B — Membros completo (3-4h)
- Modais de Títulos / Ministérios / Departamentos / Funções (4 sub-ações cada)
- Modal de Transferir Igreja
- Modal de Vida Espiritual
- Modal de Tipo de Membro

### Fase C — Matrículas (2-3h)
- Situação em massa
- Lançar notas/frequência
- Data de conclusão
- Gerar certificados em lote (integrar com existente)

### Fase D — Seminários, Carteirinhas, Certificados (2-3h)
- Status em massa em todos
- Duplicar seminário
- Renovar carteirinhas vencidas
- Reemitir certificados

### Fase E — Igrejas e Usuários (1-2h, depois que essas páginas migrarem pro Supabase)

**Total estimado:** 12-18h de trabalho.

---

## 🧠 Decisões já tomadas (da conversa)

| Pergunta | Resposta |
|---|---|
| Em quais entidades? | **Todas** — membros, visitantes, matrículas, seminários, carteirinhas, certificados, futuro: igrejas, usuários |
| Quais ações? | **Todas as sugeridas** acima |
| Operação de título: a/b/c? | **Todas** (4 sub-ações: adicionar, remover, trocar, substituir) |
| Confirmação dupla? | **Sim**, em ações que afetam >5 registros |

---

## 📝 Histórico de execuções

> Será preenchido conforme cada fase for concluída.

- [ ] Fase A — Infraestrutura
- [ ] Fase B — Membros completo
- [ ] Fase C — Matrículas
- [ ] Fase D — Seminários/Carteirinhas/Certificados
- [ ] Fase E — Igrejas/Usuários (depende da migração dessas pages)
