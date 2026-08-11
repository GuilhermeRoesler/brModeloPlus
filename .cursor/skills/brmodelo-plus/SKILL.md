---
name: brmodelo-plus
description: >-
  Spec and contribution guide for BrModeloPlus — React/Vite ER diagramming app
  with optional Firebase realtime collaboration and localStorage fallback.
  Use when editing, extending, refactoring, or debugging this codebase
  (editor, dashboard, auth, Firebase, local mode, diagram nodes, SQL generation,
  auto layout, keyboard shortcuts). Always keep this skill and README.md in sync
  with product/architecture changes.
---

# BrModeloPlus — Spec do Projeto

Ferramenta web de modelagem de dados (conceitual / lógico / físico), inspirada no brModelo. Stack: React 19 + TypeScript + Vite + Tailwind v4 + Lucide; Firebase opcional (Auth + Firestore).

## Documentação viva (obrigatório)

Esta skill e o `README.md` da raiz **são a spec viva** do produto. Em **toda** mudança que altere comportamento, arquitetura, domínio, UX do editor, modos (local/nuvem) ou estrutura de pastas:

1. Atualizar **esta skill** (`.cursor/skills/brmodelo-plus/SKILL.md`) no mesmo PR/tarefa
2. Atualizar o **`README.md`** quando a mudança for visível ao usuário, afete setup/contribuição, ou mude a lista de funcionalidades / estrutura
3. Não deixar docs “para depois” — a tarefa só está completa com código **e** docs alinhados

O que tipicamente exige update:

| Mudança | Skill | README |
|---------|-------|--------|
| Novo atalho, nó, tool, painel, layout | Sim | Se for feature de usuário |
| Camada / pasta / regra de arquitetura | Sim | Seção Estrutura |
| Auth / Firebase / modo local | Sim | Setup + notas de modo |
| Só refactor interno sem mudança de comportamento | Só se a receita/caminho mudar | Não |

## Fluxo da aplicação

```
(com Firebase) LoginScreen → DashboardScreen → EditorScreen
(sem Firebase)  DashboardScreen → EditorScreen   # entra direto como LOCAL_USER
```

Roteamento em `src/App.tsx` (sem React Router): estado `user` + `roomId` decide a tela. Query `?room=<id>` reabre a sala. Sem API key, `useAuth` inicia já com `LOCAL_USER` — não há tela de login nem aviso de Firebase.

## Arquitetura (obrigatória)

```
src/
  App.tsx                 # só roteamento entre telas
  config/                 # Firebase, flags, constantes de UI
  types/                  # domínio tipado
  lib/                    # utils puros (SQL, localStorage, ids, autoLayout/ELK, nodeGeometry, reactFlowAdapter, roomNormalize)
  services/               # persistência (local OU Firestore)
  hooks/                  # estado reutilizável (auth, projects)
  components/
    auth/ | dashboard/ | editor/ | ui/
```

| Camada | Pode | Não pode |
|--------|------|----------|
| `components/` | UI + handlers de interação | imports diretos de `firebase/*` |
| `hooks/` | orquestrar services + React state | lógica de layout ELK |
| `services/` | Firestore / localStorage | JSX |
| `lib/` | funções puras (incl. ELK async) | React / Firebase SDK (exceto tipos) |
| `config/` | init e flags | lógica de negócio |
| `types/` | tipos e constantes de domínio | side effects |

**Regra de ouro:** não recolocar tudo em `App.tsx`. Novas features entram na camada certa.

Nós do editor são **HTML/CSS** (sem SVG próprio); arestas usam o SVG interno do React Flow (`BaseEdge`).

## Modo nuvem vs modo local

Flag: `isFirebaseConfigured` / `isRealtimeCollabEnabled` em `src/config/firebase.ts`.

| | Com `VITE_FIREBASE_API_KEY` | Sem API key |
|--|------------------------------|-------------|
| Auth | Google / anônimo (LoginScreen) | `LOCAL_USER` automático (sem login) |
| Projetos | Firestore `users/{uid}/projects` | `localStorage` |
| Diagrama | Firestore `rooms/{roomId}` + `onSnapshot` | `localStorage` |
| Colaboração | cursors, online count, share | **desabilitada** |

- Gate de init: só chamar `initializeApp` se a API key existir.
- Sem Firebase, **não** quebrar o editor — só desligar collab (cursors / share / presença); UI vai direto ao dashboard.
- Persistência local: `src/lib/localStorage.ts` + `src/services/projects.ts` e `rooms.ts`.

Paths Firestore (não alterar sem migração):

- `artifacts/{appId}/users/{uid}/projects/{roomId}`
- `artifacts/{appId}/public/data/rooms/{roomId}`
- `artifacts/{appId}/public/data/cursors/{roomId}_{uid}`

## Domínio do diagrama

Constantes em `src/types/index.ts`:

- **Modes:** `conceitual` | `logico` | `fisico`
- **Node types:** `entity` | `relationship` | `attribute` | `table`
- **Tools:** `select` | `entity` | `relationship` | `table` | `connection`

`DiagramNode.x/y` = **canto superior esquerdo** (mesmo modelo do React Flow). Salas antigas com coordenadas de centro são migradas em `lib/roomNormalize.ts` (`coordSpace: 'topLeft'`). Centros geométricos: `getNodeCenter` em `lib/nodeGeometry.ts`.

**Fonte da verdade no editor:** React Flow (`nodes`/`edges` no canvas). O domínio `DiagramNode[]` / `Connection[]` é a forma de **persistência** (Firestore / localStorage) e de regras de modelagem (SQL, painel, Enter). Conversão em `lib/reactFlowAdapter.ts` (`toFlowNodes` / `fromFlowNodes` / `toFlowEdges`).

No modo conceitual: entidades, relacionamentos, atributos (notação **Heuser**: círculo pequeno + rótulo ao lado; chave = círculo preenchido; derivado = tracejado; multivalorado = círculo duplo).  
Nos modos lógico/físico: tabelas + colunas (PK/FK).  
SQL DDL: `src/lib/sql.ts` a partir de nós `table`.

### Editor — comportamentos atuais

Orquestração em `components/editor/EditorScreen.tsx` (envolto em `ReactFlowProvider`); canvas em `CanvasBoard.tsx` via **[@xyflow/react](https://reactflow.dev/)**; nós/edges custom em `components/editor/flow/`.

- **Seleção / pan / zoom / box select** (Shift + arrastar) — nativos do React Flow; **scroll do mouse = zoom** (`zoomOnScroll`, `panOnScroll={false}`); pan por arrastar (ou botão do meio/direito fora do tool select)
- **Atributos “grudam” no dono** via **`parentId`** do React Flow (posição relativa ao estrutural / atributo composto). Sem snap custom no mouseup; ao persistir, `fromFlowNodes` reconverte para coordenadas absolutas
- **Conexões** — tool `connection`: drag nativo handle→handle (`onConnect`, `ConnectionMode.Loose`); handles centrais visíveis só nesse modo
- **Auto layout** (`lib/autoLayout.ts`, **async**): **ELK.js stress** só nos nós estruturais (entidade / relacionamento / tabela) para o losango ficar **entre** as entidades; **atributos em órbita** ao redor do dono (notação Chen/Heuser); botão na `Toolbar`
- **`commitDiagram`**: async; por padrão aplica `autoLayout` + `fitView`; opções `{ fit?, layout? }` — criação rápida de atributos / conexões usam `layout: false`
- **Enter (modo conceitual):** com entidade, relacionamento ou atributo (já ligado) selecionado → cria atributo ligado ao dono, seleciona e abre **edição inline** do nome; Enter de novo no input cria o próximo; Esc / clique fora finaliza (rótulo vazio → `"Atributo"`)
- **Rótulo do atributo:** à direita/esquerda conforme centros relativos atributo↔dono
- **Viewport / fit:** `fitView` do React Flow (`fitRequestId`)
- **Cursores remotos:** `flow/RemoteCursors.tsx` (flow → screen via `flowToScreenPosition`)

## Como alterar (receitas)

### Novo tipo de nó / ferramenta

1. Estender `NODE_TYPES` / `Tool` em `types/`
2. Criar componente de nó em `components/editor/flow/` e registrar em `CanvasBoard` (`nodeTypes`)
3. Mapear tamanho em `lib/nodeGeometry.ts` e tipo em `lib/reactFlowAdapter.ts` (`toFlowNodes` / `fromFlowNodes`)
4. Adicionar botão em `Toolbar.tsx` (respeitar mode)
5. Campos em `PropertiesPanel.tsx`
6. Factory em `EditorScreen` (`addNodeAt`) — posição top-left via `topLeftFromCenter` se o clique for o centro visual
7. Atualizar skill + README (documentação viva)

### Atalho / UX do canvas

1. Handler em `EditorScreen` (preferir `window` + refs para não stale-close)
2. Se for edição visual de nó → props/context em `DiagramFlowContext` + componente do nó
3. Não disparar atalhos com foco em `INPUT`/`TEXTAREA`/`SELECT` (exceto inputs do próprio atalho, ex. `data-inline-label-edit`)
4. Documentar o atalho nesta skill e no README se for feature de usuário

### Auto layout / posicionamento

1. Algoritmo em `lib/autoLayout.ts` — **async**: (1) ELK **stress** em nós estruturais; (2) atributos em círculo ao redor do dono — top-left, sem React
2. Chamada via `commitDiagram` / botão da toolbar
3. Atributos novos “rápidos” (Enter): posicionar via `getNodeCenter`/`topLeftFromCenter`/`attributeOffsetX` e `layout: false`; o adapter atribui `parentId` no próximo `toFlowNodes`
4. Após layout com `fit: true`, incrementar `fitRequestId` para o `FitController` chamar `fitView`

### Nova tela / fluxo de navegação

1. Componente em `components/<area>/`
2. Estado/navegação em `App.tsx` (ou hook dedicado)
3. Sem lógica de Firebase no componente — use `services/` / `hooks/`

### Mudança de persistência

1. Preferir `services/projects.ts` e `services/rooms.ts`
2. Manter **paridade** local ↔ Firestore (mesma API do service)
3. UI não escolhe storage — o service decide via `isRealtimeCollabEnabled` / `user.isLocal`

### Collab em tempo real

- Sync de sala + cursors: `services/rooms.ts`
- UI de presença/share: `EditorHeader.tsx`
- Render de cursors remotos: `components/editor/flow/RemoteCursors.tsx`
- Sem API key: esses caminhos devem no-op / ocultar UI

### Auth

- Hook: `hooks/useAuth.ts` — sem API key, estado inicial já é `LOCAL_USER`
- Tela: `components/auth/LoginScreen.tsx` (só com Firebase configurado)
- Não inicializar Firebase se não houver API key
- Dashboard: botão Sair oculto para `user.isLocal`

## Convenções de código

- TypeScript estrito; `import type` para tipos (`verbatimModuleSyntax`)
- Sem `enum` (`erasableSyntaxOnly`) — use `as const` objects
- UI em português (labels, alerts, copy)
- Tailwind v4; ícones Lucide; canvas com **React Flow** (`@xyflow/react`) + layout **ELK.js**
- Preferir componentes focados; extrair se um arquivo crescer demais
- Após mudanças estruturais: `npm run build` (tsc + vite)
- **Docs no mesmo passo:** skill + README quando couber (ver “Documentação viva”)

## O que evitar

- Monolito em um único arquivo
- Firebase direto em componentes de UI
- Quebrar o app quando `.env` Firebase estiver ausente
- Feature flags ad-hoc espalhadas — usar `config/firebase.ts`
- Alterar paths Firestore sem plano de migração
- Adicionar React Router sem necessidade clara (roteamento atual é intencional e mínimo)
- Entregar feature/comportamento novo **sem** atualizar esta skill (e o README quando aplicável)

## Checklist rápido antes de PR

- [ ] Arquivo na pasta/camada correta
- [ ] Tipos atualizados em `types/`
- [ ] Paridade local + Firebase (se tocar persistência)
- [ ] Collab só ativa com API key
- [ ] `npm run build` ok
- [ ] **Skill atualizada** (comportamento / arquitetura / receitas)
- [ ] **README atualizado** (se feature, setup ou estrutura mudaram)
