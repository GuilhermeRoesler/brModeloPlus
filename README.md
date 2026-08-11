# BrModeloPlus

> Modelagem de dados moderna — conceitual, lógico e físico — no navegador, com persistência local.

**BrModeloPlus** é uma ferramenta web de modelagem de banco de dados, inspirada no clássico brModelo. Permite criar diagramas ER no navegador com persistência em `localStorage`.

![](public/demo.png)

## Funcionalidades

- **3 modos de modelagem** — cada um com **canvas próprio**; lógico e físico são **derivados automaticamente** do conceitual (somente leitura estrutural)
  - **Conceitual:** entidades (incluindo fracas), relacionamentos e atributos na notação Heuser (haste vertical sob o dono, círculo + rótulo à direita; chave / derivado / multivalorado).
  - **Lógico:** tabelas/FKs geradas a partir do conceitual.
  - **Físico:** mesma derivação + geração de SQL DDL.
- **Editor**
  - Drag-and-drop, zoom (scroll), pan, seleção múltipla (Shift), Delete/Backspace via **React Flow**. Ao arrastar entidade/relacionamento, os atributos ligados vão junto.
  - Painel de propriedades.
  - **Auto layout** (**ELK.js stress** nos nós estruturais; atributos Heuser em cascata sob o dono).
  - **Conectar:** arrastar handle→handle (modo Conectar).
  - **Cardinalidade:** chips nas arestas (clique para ciclar 1, N, (0,1)…); em entidade↔relacionamento o valor fica no lado da entidade. Também editável no painel ao selecionar a aresta.
  - **Enter** (modo conceitual): cria atributo ligado abaixo do dono com edição inline do nome.
  - **Tab** (modo conceitual): com entidade selecionada, cria relacionamento já conectado à direita (edição inline); Tab de novo cria a próxima entidade interligada.
- **Geração de SQL:** `CREATE TABLE` a partir do modelo físico.
- **Import / export JSON:** baixar ou carregar o projeto (conceitual + lógico + físico). No dashboard, importar cria um projeto novo; no editor, importar substitui a sala atual.
- **Projetos locais:** criar, listar e excluir diagramas (`localStorage`).

## Tecnologias

- **Frontend:** [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
- **Build:** [Vite](https://vitejs.dev/)
- **UI:** [Tailwind CSS v4](https://tailwindcss.com/), [Lucide](https://lucide.dev/)
- **Canvas / layout:** [React Flow](https://reactflow.dev/) (`@xyflow/react`), [ELK.js](https://www.eclipse.org/elk/)

## Como executar

### Pré-requisitos

- Node.js 18+
- npm ou yarn

### 1. Clonar e instalar

```bash
git clone https://github.com/seu-usuario/brmodeloplus.git
cd brmodeloplus
npm install
```

### 2. Dev server

```bash
npm run dev
```

Acesse `http://localhost:5173`. O app abre direto no dashboard (modo local).

## Estrutura do código

```
src/
  App.tsx                 # Roteador (dashboard → editor)
  config/                 # Constantes e LOCAL_USER
  types/                  # ErNode / ErEdge (React Flow) + Mode/Tool/Project
  lib/                    # SQL, localStorage, autoLayout/ELK, nodeGeometry, diagramFlow, cardinality
  services/               # Projetos e salas (localStorage)
  hooks/                  # useAuth, useProjects
  components/
    dashboard/            # DashboardScreen
    editor/               # Editor + React Flow canvas, toolbar, painéis
      flow/               # Nós/edges HTML
    ui/                   # Componentes reutilizáveis
```

Spec detalhada para agentes e contribuidores: [`.cursor/skills/brmodelo-plus/SKILL.md`](.cursor/skills/brmodelo-plus/SKILL.md).

## Scripts

- `npm run dev` — servidor de desenvolvimento
- `npm run build` — build de produção (`tsc` + Vite)
- `npm run lint` — ESLint
- `npm run preview` — preview do build

## Contribuição

Contribuições são bem-vindas (Issues e Pull Requests).

1. Fork + branch (`git checkout -b feature/sua-feature`)
2. Implemente a mudança na **camada correta** (ver skill)
3. **Documentação viva:** atualize `.cursor/skills/brmodelo-plus/SKILL.md` e este `README.md` sempre que o comportamento, a arquitetura, o setup ou as funcionalidades mudarem — no mesmo PR
4. `npm run build` ok
5. Abra o Pull Request

## Licença

MIT — veja o arquivo `LICENSE` no repositório.

---

Feito por [Guilherme Roesler](https://github.com/guilhermeroesler)
