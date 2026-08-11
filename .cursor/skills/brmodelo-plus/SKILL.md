---
name: brmodelo-plus
description: >-
  Spec and contribution guide for BrModeloPlus — React/Vite ER diagramming app
  with localStorage persistence. Use when editing, extending, refactoring, or
  debugging this codebase (editor, dashboard, diagram nodes, SQL generation,
  auto layout, keyboard shortcuts). Always keep this skill and README.md in sync
  with product/architecture changes.
---

# BrModeloPlus — Spec do Projeto

Ferramenta web de modelagem de dados (conceitual / lógico / físico), inspirada no brModelo. Stack: React 19 + TypeScript + Vite + Tailwind v4 + Lucide; canvas **React Flow** (`@xyflow/react`) + layout **ELK.js**; persistência **localStorage** (sem Firebase/Firestore).

## Documentação viva (obrigatório)

Esta skill e o `README.md` da raiz **são a spec viva** do produto. Em **toda** mudança que altere comportamento, arquitetura, domínio, UX do editor ou estrutura de pastas:

1. Atualizar **esta skill** (`.cursor/skills/brmodelo-plus/SKILL.md`) no mesmo PR/tarefa
2. Atualizar o **`README.md`** quando a mudança for visível ao usuário, afete setup/contribuição, ou mude a lista de funcionalidades / estrutura
3. Não deixar docs “para depois” — a tarefa só está completa com código **e** docs alinhados

## Fluxo da aplicação

```
DashboardScreen → EditorScreen   # LOCAL_USER automático (sem login)
```

Roteamento em `src/App.tsx` (sem React Router): estado `user` + `roomId` decide a tela. Query `?room=<id>` reabre a sala.

## Arquitetura (obrigatória)

```
src/
  App.tsx                 # roteamento dashboard ↔ editor
  config/                 # constantes de UI, LOCAL_USER
  types/                  # ErNode / ErEdge (React Flow) + Mode/Tool/Project
  lib/                    # utils puros (SQL, localStorage, ids, autoLayout/ELK, nodeGeometry, diagramFlow)
  services/               # persistência local (projects + rooms)
  hooks/                  # useAuth (local), useProjects
  components/
    dashboard/ | editor/ | ui/
```

| Camada | Pode | Não pode |
|--------|------|----------|
| `components/` | UI + handlers de interação | lógica de layout ELK |
| `hooks/` | orquestrar services + React state | lógica de layout ELK |
| `services/` | localStorage | JSX |
| `lib/` | funções puras (incl. ELK async) | React (exceto tipos do RF) |
| `config/` | flags / usuário local | lógica de negócio |
| `types/` | tipos e constantes de domínio | side effects |

**Regra de ouro:** não recolocar tudo em `App.tsx`. Novas features entram na camada certa.

Nós do editor são **HTML/CSS**; arestas usam o SVG interno do React Flow (`BaseEdge`).

## Persistência

Tudo em `localStorage` via `src/lib/localStorage.ts` + `src/services/projects.ts` e `rooms.ts`.

Documento de sala (`RoomData`):

```ts
{ nodes: ErNode[], edges: ErEdge[], mode: Mode, version: 2 }
```

Leitura direta do JSON no `localStorage` — sem normalização/migração.

## Domínio do diagrama (100% React Flow)

Constantes em `src/types/index.ts`:

- **Modes:** `conceitual` | `logico` | `fisico`
- **Node types:** `entity` | `relationship` | `attribute` | `table`
- **Tools:** `select` | `entity` | `relationship` | `table` | `connection`

Tipos canônicos:

- `ErNode` = `Node<ErNodeData, NodeType>` do React Flow (`position`, `data.label`, …)
- `ErEdge` = `Edge<ErEdgeData>` (`source`/`target`, `data.cardinalitySource|Target`)

Helpers em `lib/diagramFlow.ts`: `createErNode` / `createErEdge`, `findAttributeOwnerId`, `patchNodeData`, `normalizeErNodes`/`normalizeErEdges`.

Centros geométricos: `getNodeCenter` em `lib/nodeGeometry.ts`.

No modo conceitual: entidades, relacionamentos, atributos na notação **Heuser**
(círculo oco sob o dono, haste vertical a partir da base, rótulo à direita;
chave = círculo preenchido + rótulo sublinhado; derivado = tracejado; multivalorado = círculo duplo).
Nos modos lógico/físico: tabelas + colunas (PK/FK).  
SQL DDL: `src/lib/sql.ts` a partir de nós `table`.

### Editor — comportamentos atuais

Orquestração em `components/editor/EditorScreen.tsx` (`ReactFlowProvider` + `useNodesState` / `useEdgesState`); canvas em `CanvasBoard.tsx` (wrapper fino do `<ReactFlow>`).

- **Seleção / pan / zoom / box select / Delete·Backspace** — nativos do React Flow; scroll = zoom; seleção lida de `node.selected` / `edge.selected`
- **Drag estrutural** — ao mover entidade/relacionamento, atributos ligados (incl. compostos) acompanham o mesmo delta (`followStructuralDrags`); ids já no lote de drag não são deslocados de novo (multi-seleção)
- **Conexões** — tool `connection`: handle→handle (`ConnectionMode.Loose`)
- **Auto layout** (`lib/autoLayout.ts`): **ELK.js stress** nos nós estruturais; atributos Heuser reposicionados em cascata sob o dono
- **`commitDiagram`**: async; `{ fit?, layout? }` — Enter/conexões usam `layout: false`
- **Enter (conceitual):** cria atributo ligado **abaixo** do dono (cascata Heuser), edição inline; Esc / blur finaliza
- **Tab (conceitual):** cadeia estrutural — entidade selecionada → relacionamento à direita já conectado (edição inline); Tab de novo → nova entidade interligada; pode repetir a cadeia
- **Viewport / fit:** `fitView` via `fitRequestId`

Helpers Heuser em `lib/diagramFlow.ts`: `heuserAttributePosition`, `layoutHeuserAttributes`, `linkedAttributesOf`, `attributeSubtreeOf`, `followStructuralDrags`.
Posição da cadeia Tab: `positionRightOf`.

## Como alterar (receitas)

### Novo tipo de nó / ferramenta

1. Estender `NODE_TYPES` / `Tool` em `types/`
2. Componente em `components/editor/flow/` + registro em `CanvasBoard` (`nodeTypes`)
3. Tamanho em `lib/nodeGeometry.ts` + factory em `lib/diagramFlow.ts`
4. Botão em `Toolbar.tsx`
5. Campos em `PropertiesPanel.tsx`
6. Factory em `EditorScreen` (`addNodeAt`)
7. Atualizar skill + README

### Auto layout / posicionamento

1. Algoritmo em `lib/autoLayout.ts` (ELK stress nos estruturais + cascata Heuser nos atributos)
2. Chamada via `commitDiagram` / toolbar
3. Atributos rápidos (Enter): `heuserAttributePosition` + `layoutHeuserAttributes` sob o dono + edge + `layout: false`
4. Cadeia Tab (entidade ↔ relacionamento): `positionRightOf` + edge + `layout: false` + edição inline

## Convenções de código

- TypeScript estrito; `import type` para tipos
- Sem `enum` — use `as const`
- UI em português
- Canvas: **React Flow** + **ELK.js**; persistência local
- Após mudanças estruturais: `npm run build`
- **Docs no mesmo passo:** skill + README quando couber

## O que evitar

- Monolito em `App.tsx`
- Reintroduzir Firebase/Firestore sem decisão explícita de produto
- Dual-state `DiagramNode` flat paralelo ao React Flow
- Entregar feature nova **sem** atualizar esta skill (e o README quando aplicável)

## Checklist rápido antes de PR

- [ ] Arquivo na pasta/camada correta
- [ ] Tipos atualizados (`ErNode` / `ErEdge`)
- [ ] `npm run build` ok
- [ ] **Skill atualizada**
- [ ] **README atualizado** (se feature, setup ou estrutura mudaram)
