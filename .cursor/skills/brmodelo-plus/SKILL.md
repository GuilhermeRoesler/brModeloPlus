---
name: brmodelo-plus
description: >-
  Spec and contribution guide for BrModeloPlus — React/Vite ER diagramming app
  with optional Firebase realtime collaboration and localStorage fallback.
  Use when editing, extending, refactoring, or debugging this codebase
  (editor, dashboard, auth, Firebase, local mode, diagram nodes, SQL generation).
---

# BrModeloPlus — Spec do Projeto

Ferramenta web de modelagem de dados (conceitual / lógico / físico), inspirada no brModelo. Stack: React 19 + TypeScript + Vite + Tailwind v4 + Lucide; Firebase opcional (Auth + Firestore).

## Fluxo da aplicação

```
LoginScreen → DashboardScreen → EditorScreen
```

Roteamento em `src/App.tsx` (sem React Router): estado `user` + `roomId` decide a tela. Query `?room=<id>` reabre a sala.

## Arquitetura (obrigatória)

```
src/
  App.tsx                 # só roteamento entre telas
  config/                 # Firebase, flags, constantes de UI
  types/                  # domínio tipado
  lib/                    # utils puros (SQL, localStorage, ids)
  services/               # persistência (local OU Firestore)
  hooks/                  # estado reutilizável (auth, projects)
  components/
    auth/ | dashboard/ | editor/ | ui/
```

| Camada | Pode | Não pode |
|--------|------|----------|
| `components/` | UI + handlers de interação | imports diretos de `firebase/*` |
| `hooks/` | orquestrar services + React state | lógica de desenho SVG |
| `services/` | Firestore / localStorage | JSX |
| `lib/` | funções puras | React / Firebase SDK |
| `config/` | init e flags | lógica de negócio |
| `types/` | tipos e constantes de domínio | side effects |

**Regra de ouro:** não recolocar tudo em `App.tsx`. Novas features entram na camada certa.

## Modo nuvem vs modo local

Flag: `isFirebaseConfigured` / `isRealtimeCollabEnabled` em `src/config/firebase.ts`.

| | Com `VITE_FIREBASE_API_KEY` | Sem API key |
|--|------------------------------|-------------|
| Auth | Google / anônimo | `LOCAL_USER` (guest local) |
| Projetos | Firestore `users/{uid}/projects` | `localStorage` |
| Diagrama | Firestore `rooms/{roomId}` + `onSnapshot` | `localStorage` |
| Colaboração | cursors, online count, share | **desabilitada** |

- Gate de init: só chamar `initializeApp` se a API key existir.
- Sem Firebase, **não** quebrar o editor — só desligar collab (cursors / share / presença).
- Persistência local: `src/lib/localStorage.ts` + `src/services/projects.ts` e `rooms.ts`.

Paths Firestore (não alterar sem migração):

- `artifacts/{appId}/users/{uid}/projects/{roomId}`
- `artifacts/{appId}/public/data/rooms/{roomId}`
- `artifacts/{appId}/public/data/cursors/{roomId}_{uid}`

## Domínio do diagrama

Constantes em `src/types/index.ts`:

- **Modes:** `conceitual` | `logico` | `fisico`
- **Node types:** `entity` | `relationship` | `attribute` | `table`
- **Tools:** `select` | `entity` | `relationship` | `attribute` | `table` | `connection`

No modo conceitual: entidades, relacionamentos, atributos.  
Nos modos lógico/físico: tabelas + colunas (PK/FK).  
SQL DDL: `src/lib/sql.ts` a partir de nós `table`.

## Como alterar (receitas)

### Novo tipo de nó / ferramenta

1. Estender `NODE_TYPES` / `Tool` em `types/`
2. Criar shape no `components/editor/CanvasBoard.tsx` (`renderNode`)
3. Adicionar botão em `Toolbar.tsx` (respeitar mode)
4. Campos em `PropertiesPanel.tsx`
5. Factory em `EditorScreen` (`addNode`)

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
- Render de cursors remotos: `CanvasBoard.tsx`
- Sem API key: esses caminhos devem no-op / ocultar UI

### Auth

- Hook: `hooks/useAuth.ts`
- Tela: `components/auth/LoginScreen.tsx`
- Não inicializar Firebase se não houver API key

## Convenções de código

- TypeScript estrito; `import type` para tipos (`verbatimModuleSyntax`)
- Sem `enum` (`erasableSyntaxOnly`) — use `as const` objects
- UI em português (labels, alerts, copy)
- Tailwind v4; ícones Lucide
- Preferir componentes focados; extrair se um arquivo crescer demais
- Após mudanças estruturais: `npm run build` (tsc + vite)

## O que evitar

- Monolito em um único arquivo
- Firebase direto em componentes de UI
- Quebrar o app quando `.env` Firebase estiver ausente
- Feature flags ad-hoc espalhadas — usar `config/firebase.ts`
- Alterar paths Firestore sem plano de migração
- Adicionar React Router sem necessidade clara (roteamento atual é intencional e mínimo)

## Checklist rápido antes de PR

- [ ] Arquivo na pasta/camada correta
- [ ] Tipos atualizados em `types/`
- [ ] Paridade local + Firebase (se tocar persistência)
- [ ] Collab só ativa com API key
- [ ] `npm run build` ok
